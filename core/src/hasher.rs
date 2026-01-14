//! # Content Hasher
//!
//! Cryptographic hashing utilities for content addressing.
//! Uses SHA-256 for strong collision resistance and wide compatibility.

use sha2::{Digest, Sha256};

use crate::types::ChunkId;

/// A content-based hasher using SHA-256.
///
/// Provides deterministic, cryptographically secure hashes suitable for
/// content addressing and integrity verification.
#[derive(Debug, Clone, Default)]
pub struct ContentHasher {
    // Stateless hasher - each computation is independent
    // Future: could cache recent hashes for dedup detection
}

impl ContentHasher {
    /// Creates a new hasher instance.
    pub fn new() -> Self {
        Self::default()
    }

    /// Computes the SHA-256 hash of the provided data.
    ///
    /// # Arguments
    ///
    /// * `data` - Byte slice to hash
    ///
    /// # Returns
    ///
    /// A `ChunkId` containing the hex-encoded hash string.
    ///
    /// # Performance
    ///
    /// SHA-256 is optimized on modern CPUs with hardware acceleration.
    /// Typical throughput exceeds 500 MB/s on x86_64 with SHA extensions.
    #[inline]
    pub fn compute(&self, data: &[u8]) -> ChunkId {
        let mut hasher = Sha256::new();
        hasher.update(data);
        let result = hasher.finalize();

        ChunkId(hex::encode(result))
    }

    /// Verifies that data matches an expected hash.
    ///
    /// # Arguments
    ///
    /// * `data` - Data to verify
    /// * `expected` - Expected hash value
    ///
    /// # Returns
    ///
    /// `true` if the computed hash matches the expected value.
    pub fn verify(&self, data: &[u8], expected: &ChunkId) -> bool {
        self.compute(data) == *expected
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deterministic_hashing() {
        let hasher = ContentHasher::new();
        let data = b"test data";

        let hash1 = hasher.compute(data);
        let hash2 = hasher.compute(data);

        assert_eq!(hash1, hash2);
    }

    #[test]
    fn test_different_data_different_hash() {
        let hasher = ContentHasher::new();

        let hash1 = hasher.compute(b"data1");
        let hash2 = hasher.compute(b"data2");

        assert_ne!(hash1, hash2);
    }

    #[test]
    fn test_verification() {
        let hasher = ContentHasher::new();
        let data = b"verify me";
        let hash = hasher.compute(data);

        assert!(hasher.verify(data, &hash));
        assert!(!hasher.verify(b"wrong data", &hash));
    }
}
