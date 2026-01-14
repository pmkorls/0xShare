//! # OxShare Core Engine
//!
//! A high-performance Rust library designed for secure, decentralized data sharing.
//! This crate provides the foundational primitives for content-addressed storage,
//! cryptographic hashing, and chunk-based data processing.
//!
//! ## Architecture
//!
//! The engine is built around zero-copy principles where possible, leveraging Rust's
//! ownership model to ensure memory safety without runtime overhead.
//!
//! ## Future WASM Support
//!
//! This library is designed with WebAssembly compilation in mind. The `wasm` feature
//! flag enables browser-compatible builds for client-side processing.

pub mod engine;
pub mod hasher;
pub mod types;

pub use engine::ProcessingEngine;
pub use hasher::ContentHasher;
pub use types::{Chunk, ChunkId, ProcessingResult};

/// Library version for compatibility checks
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

/// Default chunk size for data segmentation (256 KB)
/// Optimized for network transmission and parallel processing
pub const DEFAULT_CHUNK_SIZE: usize = 262_144;

/// Initializes the core engine with default configuration.
///
/// # Returns
///
/// A configured `ProcessingEngine` instance ready for data operations.
///
/// # Example
///
/// ```
/// let engine = oxshare_core::init();
/// ```
pub fn init() -> ProcessingEngine {
    ProcessingEngine::new(DEFAULT_CHUNK_SIZE)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_engine_initialization() {
        let engine = init();
        assert_eq!(engine.chunk_size(), DEFAULT_CHUNK_SIZE);
    }
}
