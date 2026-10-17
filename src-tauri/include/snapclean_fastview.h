/**
 * ============================================================================
 * SnapClean AI - FastView Native Dynamic Link Library (DLL)
 * Header: snapclean_fastview.h
 * Target Version: v2.4.0
 * Architecture: Cross-Platform C-ABI (x86_64, aarch64, Windows, macOS, Linux)
 * 
 * Purpose: Ultra-fast photo library rendering, embedded EXIF thumbnail extraction,
 *          SIMD-accelerated downsampling, LRU memory caching, and BlurHash preview.
 * ============================================================================
 */

#ifndef SNANCLEAN_FASTVIEW_H
#define SNANCLEAN_FASTVIEW_H

#include <stdint.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

#if defined(_WIN32) || defined(__CYGWIN__)
  #ifdef SNAPCLEAN_FASTVIEW_EXPORTS
    #define FASTVIEW_API __declspec(dllexport)
  #else
    #define FASTVIEW_API __declspec(dllimport)
  #endif
#else
  #if __GNUC__ >= 4
    #define FASTVIEW_API __attribute__((visibility("default")))
  #else
    #define FASTVIEW_API
  #endif
#endif

/**
 * Returns the version string of the FastView DLL.
 * Example: "2.4.0-fastview-dll"
 */
FASTVIEW_API const char* snapclean_fastview_version(void);

/**
 * Extracts embedded JPEG thumbnail directly from EXIF/JFIF/RAW metadata header
 * without full image decoding (<1ms ultra-fast extraction).
 * 
 * @param file_path    Null-terminated UTF-8 file path of the source image.
 * @param out_buf      Pointer to caller-allocated memory buffer to receive raw JPEG bytes.
 * @param out_len      Capacity in bytes of out_buf.
 * @param out_written  Pointer to receive actual written byte count.
 * @return 0 on success, negative error code on failure:
 *         -1: Null arguments
 *         -2: UTF-8 parse error
 *         -3: File open error
 *         -4: No embedded EXIF thumbnail found
 *         -5: Buffer too small (out_written receives required size)
 */
FASTVIEW_API int32_t snapclean_fastview_extract_exif_thumbnail(
    const char* file_path,
    uint8_t* out_buf,
    size_t out_len,
    size_t* out_written
);

/**
 * Generates an ultra-fast downsampled thumbnail using SIMD/box-filter downsampling.
 * Automatically tries embedded EXIF first; if missing, downsamples efficiently.
 * 
 * @param file_path    Source image path.
 * @param max_width    Target max width (e.g. 256).
 * @param max_height   Target max height (e.g. 256).
 * @param quality      Quality factor (1-100, default 80).
 * @param out_buf      Buffer to receive encoded JPEG/WebP bytes.
 * @param out_len      Capacity of out_buf.
 * @param out_written  Pointer to receive actual written byte count.
 * @return 0 on success, negative on error.
 */
FASTVIEW_API int32_t snapclean_fastview_generate_fast_thumbnail(
    const char* file_path,
    uint32_t max_width,
    uint32_t max_height,
    uint32_t quality,
    uint8_t* out_buf,
    size_t out_len,
    size_t* out_written
);

/**
 * Computes dominant RGB hex color and mini DCT BlurHash string for 0ms instant preview placeholder.
 * 
 * @param file_path      Source image path.
 * @param out_hex_color  Output buffer for null-terminated hex string (e.g. "#4A7C59\0", min 8 bytes).
 * @param out_color_len  Size of out_hex_color buffer.
 * @param out_blurhash   Output buffer for null-terminated BlurHash string (min 32 bytes).
 * @param out_hash_len   Size of out_blurhash buffer.
 * @return 0 on success, negative on error.
 */
FASTVIEW_API int32_t snapclean_fastview_compute_color_preview(
    const char* file_path,
    char* out_hex_color,
    size_t out_color_len,
    char* out_blurhash,
    size_t out_hash_len
);

/**
 * Multi-threaded background thumbnail prefetching for gallery viewports.
 * 
 * @param paths_json        JSON array string of file paths (e.g. '["/path/1.jpg", "/path/2.jpg"]').
 * @param cache_target_px   Target thumbnail bounding dimension (e.g. 256).
 * @return Number of items queued for prefetching, or negative error code.
 */
FASTVIEW_API int32_t snapclean_fastview_batch_prefetch(
    const char* paths_json,
    uint32_t cache_target_px
);

/**
 * Retrieves a pre-cached thumbnail from the native FastView LRU memory pool.
 * 
 * @param file_path    Source image path.
 * @param out_buf      Output buffer for cached image bytes.
 * @param out_len      Capacity of out_buf.
 * @param out_written  Pointer to receive written bytes.
 * @return 0 on cache hit, 1 on cache miss, negative on error.
 */
FASTVIEW_API int32_t snapclean_fastview_lru_get(
    const char* file_path,
    uint8_t* out_buf,
    size_t out_len,
    size_t* out_written
);

/**
 * Clears the native FastView in-memory LRU thumbnail cache and frees memory.
 * 
 * @return 0 on success.
 */
FASTVIEW_API int32_t snapclean_fastview_lru_clear(void);

/**
 * Sets the active platform profile for FastView operations.
 * 
 * @param profile_mode  0: Auto detect (PC vs Mobile)
 *                      1: PC High-Performance Mode (High concurrency, 800 items L1, hover zoom)
 *                      2: Mobile Low-Power Mode (2 threads, 160 items L1, touch swipe, battery aware)
 * @return 0 on success, negative on error.
 */
FASTVIEW_API int32_t snapclean_fastview_set_profile(int32_t profile_mode);

/**
 * Returns active platform profile mode (1: PC, 2: Mobile).
 */
FASTVIEW_API int32_t snapclean_fastview_get_profile(void);

/**
 * Fine-tunes LRU cache capacity and prefetch concurrency limits directly.
 * 
 * @param max_items    Maximum allowed in-memory LRU items (e.g. 160–800).
 * @param concurrency  Parallel worker thread count (e.g. 1–8).
 * @return 0 on success.
 */
FASTVIEW_API int32_t snapclean_fastview_tune_cache(uint32_t max_items, uint32_t concurrency);

/**
 * Returns JSON statistics of the FastView native cache (hits, misses, memory size, item count).
 * 
 * @param out_json  Buffer to receive null-terminated JSON string.
 * @param json_len  Capacity of out_json.
 * @return 0 on success, negative on error.
 */
FASTVIEW_API int32_t snapclean_fastview_stats(
    char* out_json,
    size_t json_len
);

#ifdef __cplusplus
}
#endif

#endif /* SNANCLEAN_FASTVIEW_H */
