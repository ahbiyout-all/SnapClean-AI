use std::collections::HashMap;

/// High-performance FNV-1a 32-bit hash implementation in Rust
pub fn fast_fnv1a_hash(data: &[u8]) -> u32 {
    let mut hval: u32 = 0x811c9dc5;
    for &byte in data {
        hval ^= byte as u32;
        hval = hval.wrapping_mul(0x01000193);
    }
    hval
}

/// Sparse chunk hash (Head 4KB + Mid 4KB + Tail 4KB)
pub fn compute_sparse_hash_bytes(full_data: &[u8]) -> String {
    let size = full_data.len();
    if size == 0 {
        return "sparse_0_empty".to_string();
    }
    if size <= 12288 {
        let hash = fast_fnv1a_hash(full_data);
        return format!("sparse_{}_{:08x}", size, hash);
    }

    let chunk_size = 4096;
    let mid_offset = (size / 2) - (chunk_size / 2);
    let tail_offset = size - chunk_size;

    let mut combined = Vec::with_capacity(chunk_size * 3);
    combined.extend_from_slice(&full_data[0..chunk_size]);
    combined.extend_from_slice(&full_data[mid_offset..mid_offset + chunk_size]);
    combined.extend_from_slice(&full_data[tail_offset..size]);

    let hash = fast_fnv1a_hash(&combined);
    format!("sparse_{}_{:08x}", size, hash)
}

/// Calculate 64-bit dHash (Difference Hash) from RGB pixel buffer (32x32 image)
pub fn compute_phash_rust(rgb_data: &[u8], width: u32, height: u32) -> String {
    if rgb_data.is_empty() || width < 32 || height < 32 {
        return "1f2e3d4c5b6a7988".to_string();
    }

    // 8x8 block average calculation
    let block_w = 4;
    let block_h = 4;
    let mut grid = [0.0f32; 64];

    for gy in 0..8 {
        for gx in 0..8 {
            let mut sum = 0.0f32;
            let mut count = 0;
            for y in 0..block_h {
                for x in 0..block_w {
                    let px = gx * block_w + x;
                    let py = gy * block_h + y;
                    let idx = ((py * width + px) * 4) as usize;
                    if idx + 2 < rgb_data.len() {
                        let r = rgb_data[idx] as f32;
                        let g = rgb_data[idx + 1] as f32;
                        let b = rgb_data[idx + 2] as f32;
                        // Rec. 601 Luma
                        let luma = 0.299 * r + 0.587 * g + 0.114 * b;
                        sum += luma;
                        count += 1;
                    }
                }
            }
            grid[gy * 8 + gx] = if count > 0 { sum / count as f32 } else { 0.0 };
        }
    }

    // Compute 64-bit difference hash (dHash horizontal gradient)
    let mut hash_u64: u64 = 0;
    for row in 0..8 {
        for col in 0..8 {
            let next_col = (col + 1) % 8;
            let bit = if grid[row * 8 + col] > grid[row * 8 + next_col] { 1 } else { 0 };
            hash_u64 = (hash_u64 << 1) | (bit as u64);
        }
    }

    format!("{:016x}", hash_u64)
}

/// Calculate Hamming distance between two 64-bit hashes
pub fn hamming_distance_hex(h1: &str, h2: &str) -> u32 {
    let val1 = u64::from_str_radix(h1, 16).unwrap_or(0);
    let val2 = u64::from_str_radix(h2, 16).unwrap_or(0);
    (val1 ^ val2).count_ones()
}

/// Size & Metadata Pruning logic in Rust
pub struct FunnelEngineRust;

impl FunnelEngineRust {
    pub fn stage1_prune_sizes(sizes: &[u64]) -> HashMap<u64, usize> {
        let mut map = HashMap::new();
        for &size in sizes {
            if size > 0 {
                *map.entry(size).or_insert(0) += 1;
            }
        }
        map
    }
}
