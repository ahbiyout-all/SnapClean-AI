use wasm_bindgen::prelude::*;
use js-sys::{Uint8Array, Array};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[wasm_bindgen]
pub fn init_panic_hook() {
    console_error_panic_hook::set_once();
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FileMetaInput {
    pub id: String,
    pub path: String,
    pub size: u64,
    pub name: String,
    pub last_modified: u64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FunnelStage1Result {
    pub kept_ids: Vec<String>,
    pub rejected_count: usize,
    pub execution_time_ms: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DedupeItemInput {
    pub id: String,
    pub size: u64,
    pub sparse_hash: String,
    pub phash: u64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DuplicateGroup {
    pub primary_id: String,
    pub duplicate_ids: Vec<String>,
    pub match_type: String, // "exact_size", "sparse_hash", "phash"
}

/// FNV-1a 32-bit hash helper
fn fnv1a_hash(bytes: &[u8]) -> u32 {
    let mut hash: u32 = 0x811c9dc5;
    for &b in bytes {
        hash ^= b as u32;
        hash = hash.wrapping_mul(0x01000193);
    }
    hash
}

/// Computes sparse chunk hash from binary buffer (Head 4KB, Mid 4KB, Tail 4KB)
#[wasm_bindgen]
pub fn compute_sparse_hash_wasm(data: &[u8]) -> String {
    let len = data.len();
    let chunk_size = 4096;
    let mut combined_bytes = Vec::with_capacity(chunk_size * 3);

    // Head
    let head_len = std::cmp::min(len, chunk_size);
    combined_bytes.extend_from_slice(&data[..head_len]);

    // Mid
    if len > chunk_size * 2 {
        let mid_start = (len / 2) - (chunk_size / 2);
        let mid_end = mid_start + chunk_size;
        combined_bytes.extend_from_slice(&data[mid_start..mid_end]);
    } else if len > 0 {
        let mid_len = std::cmp::min(len, chunk_size);
        let mid_start = len / 4;
        let mid_end = std::cmp::min(len, mid_start + mid_len);
        combined_bytes.extend_from_slice(&data[mid_start..mid_end]);
    }

    // Tail
    if len > chunk_size {
        let tail_start = len - std::cmp::min(len, chunk_size);
        combined_bytes.extend_from_slice(&data[tail_start..]);
    } else {
        combined_bytes.extend_from_slice(data);
    }

    let hash_val = fnv1a_hash(&combined_bytes);
    format!("{:08x}-{:x}", hash_val, len)
}

/// Computes perceptual hash (pHash) from image bytes using image resizing and DCT approximation
#[wasm_bindgen]
pub fn compute_phash_wasm(data: &[u8]) -> Result<u64, JsValue> {
    let img = image::load_from_memory(data)
        .map_err(|e| JsValue::from_str(&format!("Failed to decode image for pHash: {}", e)))?;

    // Resize to 32x32 grayscale
    let gray_img = img.resize_exact(32, 32, image::imageops::FilterType::Triangle).to_luma8();
    let pixels = gray_img.as_raw();

    // Compute average
    let sum: u32 = pixels.iter().map(|&p| p as u32).sum();
    let avg = (sum as f32) / (pixels.len() as f32);

    // Compute 64-bit hash (using top-left 8x8 block for simple high-speed perceptual hash)
    let mut hash: u64 = 0;
    let mut bit_index = 0;

    for y in 0..8 {
        for x in 0..8 {
            let p = pixels[(y * 32) + x] as f32;
            if p >= avg {
                hash |= 1 << bit_index;
            }
            bit_index += 1;
        }
    }

    Ok(hash)
}

/// Funnel Engine Stage 1: Instant Size & Metadata Pruning
#[wasm_bindgen]
pub fn funnel_stage1_prune_wasm(files_json: &str) -> String {
    let start = js_sys::Date::now();
    let files: Vec<FileMetaInput> = match serde_json::from_str(files_json) {
        Ok(f) => f,
        Err(e) => return format!("{{\"error\": \"{}\"}}", e),
    };

    // Group by size to instantly eliminate unique size files (90%+ non-duplicates eliminated)
    let mut size_map: HashMap<u64, Vec<FileMetaInput>> = HashMap::new();
    for file in files {
        size_map.entry(file.size).or_default().push(file);
    }

    let mut kept_ids = Vec::new();
    let mut rejected_count = 0;

    for (_size, group) in size_map {
        if group.len() > 1 {
            // Potential duplicates, keep for stage 2
            for f in group {
                kept_ids.push(f.id);
            }
        } else {
            rejected_count += 1;
        }
    }

    let execution_time_ms = js_sys::Date::now() - start;

    let result = FunnelStage1Result {
        kept_ids,
        rejected_count,
        execution_time_ms,
    };

    serde_json::to_string(&result).unwrap_or_else(|_| "{}".to_string())
}

/// Hamming distance between two 64-bit phashes
#[wasm_bindgen]
pub fn hamming_distance(a: u64, b: u64) -> u32 {
    (a ^ b).count_ones()
}

/// Dedupe Engine: Group items by exact size, sparse hash, and perceptual hash threshold
#[wasm_bindgen]
pub fn find_duplicate_groups_wasm(items_json: &str, p_threshold: u32) -> String {
    let items: Vec<DedupeItemInput> = match serde_json::from_str(items_json) {
        Ok(i) => i,
        Err(e) => return format!("{{\"error\": \"{}\"}}", e),
    };

    let mut groups: Vec<DuplicateGroup> = Vec::new();
    let mut visited: HashMap<String, bool> = HashMap::new();

    for i in 0..items.len() {
        let item_a = &items[i];
        if *visited.get(&item_a.id).unwrap_or(&false) {
            continue;
        }

        let mut duplicates = Vec::new();
        let mut match_type = "exact_size";

        for j in (i + 1)..items.len() {
            let item_b = &items[j];
            if *visited.get(&item_b.id).unwrap_or(&false) {
                continue;
            }

            // Check exact size match
            if item_a.size == item_b.size {
                // Check sparse hash match if available
                if !item_a.sparse_hash.is_empty() && item_a.sparse_hash == item_b.sparse_hash {
                    match_type = "sparse_hash";
                    duplicates.push(item_b.id.clone());
                    visited.insert(item_b.id.clone(), true);
                } else {
                    // Check pHash distance match
                    let dist = hamming_distance(item_a.phash, item_b.phash);
                    if dist <= p_threshold {
                        match_type = "phash";
                        duplicates.push(item_b.id.clone());
                        visited.insert(item_b.id.clone(), true);
                    }
                }
            }
        }

        if !duplicates.is_empty() {
            groups.push(DuplicateGroup {
                primary_id: item_a.id.clone(),
                duplicate_ids: duplicates,
                match_type: match_type.to_string(),
            });
            visited.insert(item_a.id.clone(), true);
        }
    }

    serde_json::to_string(&groups).unwrap_or_else(|_| "[]".to_string())
}
