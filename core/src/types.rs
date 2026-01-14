//! # Core Types
//!
//! Fundamental data structures used throughout the OxShare engine.
//! All types are designed for serialization compatibility and WASM interop.

use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Unique identifier for a chunk, derived from its content hash.
///
/// Uses SHA-256 hex encoding (64 characters) for compatibility
/// with common content-addressed storage systems.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct ChunkId(pub String);

impl ChunkId {
    /// Returns the raw hash string.
    pub fn as_str(&self) -> &str {
        &self.0
    }

    /// Truncates the ID for display purposes.
    ///
    /// Returns first 8 and last 8 characters, useful for logging.
    pub fn short(&self) -> String {
        if self.0.len() > 16 {
            format!("{}...{}", &self.0[..8], &self.0[self.0.len() - 8..])
        } else {
            self.0.clone()
        }
    }
}

/// A single chunk of processed data.
///
/// Chunks are the fundamental unit of storage and transmission.
/// Each chunk is independently verifiable via its content hash.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Chunk {
    /// Content-derived unique identifier
    pub id: ChunkId,

    /// Raw chunk data
    #[serde(with = "serde_bytes")]
    pub data: Vec<u8>,

    /// Byte offset in the original data stream
    pub offset: usize,
}

impl Chunk {
    /// Returns the size of this chunk in bytes.
    #[inline]
    pub fn size(&self) -> usize {
        self.data.len()
    }
}

/// Result of processing a data stream.
///
/// Contains all generated chunks plus metadata for reconstruction.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessingResult {
    /// Ordered list of chunks
    pub chunks: Vec<Chunk>,

    /// Total size of original data in bytes
    pub total_size: usize,

    /// Root hash covering all original data
    pub root_hash: ChunkId,
}

impl ProcessingResult {
    /// Returns the number of chunks generated.
    pub fn chunk_count(&self) -> usize {
        self.chunks.len()
    }

    /// Calculates the deduplication ratio if applicable.
    ///
    /// Returns None if no deduplication occurred.
    pub fn dedup_ratio(&self) -> Option<f64> {
        let unique_size: usize = self.chunks.iter().map(|c| c.size()).sum();
        if unique_size < self.total_size {
            Some(1.0 - (unique_size as f64 / self.total_size as f64))
        } else {
            None
        }
    }
}

/// Errors that can occur during engine operations.
#[derive(Debug, Error)]
pub enum EngineError {
    #[error("input data cannot be empty")]
    EmptyInput,

    #[error("chunk integrity verification failed: expected {expected:?}, got {actual:?}")]
    IntegrityFailure { expected: ChunkId, actual: ChunkId },

    #[error("serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("invalid chunk sequence: missing chunk at offset {offset}")]
    InvalidSequence { offset: usize },
}

// Implement serde_bytes for Vec<u8> compatibility
mod serde_bytes {
    use serde::{Deserialize, Deserializer, Serialize, Serializer};

    pub fn serialize<S>(bytes: &[u8], serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        bytes.serialize(serializer)
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Vec<u8>, D::Error>
    where
        D: Deserializer<'de>,
    {
        Vec::<u8>::deserialize(deserializer)
    }
}
