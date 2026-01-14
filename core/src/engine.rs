//! # Processing Engine
//!
//! Core computation engine for data chunking and reconstruction.
//! Implements a streaming architecture optimized for large file handling.

use crate::hasher::ContentHasher;
use crate::types::{Chunk, ChunkId, EngineError, ProcessingResult};

/// The main processing engine for data operations.
///
/// Handles chunking, deduplication detection, and content verification.
/// Thread-safe by design, can be shared across async tasks.
#[derive(Debug, Clone)]
pub struct ProcessingEngine {
    chunk_size: usize,
    hasher: ContentHasher,
}

impl ProcessingEngine {
    /// Creates a new engine with the specified chunk size.
    ///
    /// # Arguments
    ///
    /// * `chunk_size` - Size in bytes for each data chunk
    ///
    /// # Performance Note
    ///
    /// Chunk sizes between 64KB and 1MB generally provide optimal balance
    /// between deduplication efficiency and processing overhead.
    pub fn new(chunk_size: usize) -> Self {
        Self {
            chunk_size,
            hasher: ContentHasher::new(),
        }
    }

    /// Returns the configured chunk size.
    #[inline]
    pub fn chunk_size(&self) -> usize {
        self.chunk_size
    }

    /// Processes raw data into content-addressed chunks.
    ///
    /// Each chunk receives a unique identifier based on its SHA-256 hash,
    /// enabling deduplication and integrity verification.
    ///
    /// # Arguments
    ///
    /// * `data` - Raw byte slice to process
    ///
    /// # Returns
    ///
    /// A `ProcessingResult` containing the generated chunks and metadata.
    pub fn process(&self, data: &[u8]) -> Result<ProcessingResult, EngineError> {
        if data.is_empty() {
            return Err(EngineError::EmptyInput);
        }

        let mut chunks = Vec::new();
        let mut offset = 0;

        // Process data in fixed-size segments
        // Using iterative approach for predictable memory usage
        while offset < data.len() {
            let end = std::cmp::min(offset + self.chunk_size, data.len());
            let segment = &data[offset..end];

            let id = self.hasher.compute(segment);
            chunks.push(Chunk {
                id,
                data: segment.to_vec(),
                offset,
            });

            offset = end;
        }

        Ok(ProcessingResult {
            chunks,
            total_size: data.len(),
            root_hash: self.hasher.compute(data),
        })
    }

    /// Reconstructs original data from ordered chunks.
    ///
    /// Verifies chunk integrity during reconstruction to detect corruption.
    ///
    /// # Safety
    ///
    /// All chunk hashes are verified against their content. Any mismatch
    /// results in an error, preventing silent data corruption.
    pub fn reconstruct(&self, chunks: &[Chunk]) -> Result<Vec<u8>, EngineError> {
        if chunks.is_empty() {
            return Err(EngineError::EmptyInput);
        }

        // Pre-allocate based on expected size for efficiency
        let total_size: usize = chunks.iter().map(|c| c.data.len()).sum();
        let mut result = Vec::with_capacity(total_size);

        for chunk in chunks {
            // Verify chunk integrity before inclusion
            let computed_id = self.hasher.compute(&chunk.data);
            if computed_id != chunk.id {
                return Err(EngineError::IntegrityFailure {
                    expected: chunk.id.clone(),
                    actual: computed_id,
                });
            }
            result.extend_from_slice(&chunk.data);
        }

        Ok(result)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_roundtrip_processing() {
        let engine = ProcessingEngine::new(16);
        let input = b"Hello, 0xShare!";

        let result = engine.process(input).unwrap();
        let reconstructed = engine.reconstruct(&result.chunks).unwrap();

        assert_eq!(input.to_vec(), reconstructed);
    }

    #[test]
    fn test_empty_input_rejected() {
        let engine = ProcessingEngine::new(16);
        assert!(engine.process(&[]).is_err());
    }
}
