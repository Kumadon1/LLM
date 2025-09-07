"""
Word Validation Utilities
Provides word validation with multiple fallback strategies
"""
import os
import re
from typing import List, Set


# Try to help PyEnchant find the system library on macOS (Homebrew path on Apple Silicon)
for cand in ["/opt/homebrew/lib/libenchant-2.dylib", "/usr/local/lib/libenchant-2.dylib"]:
    if os.path.exists(cand):
        os.environ.setdefault("PYENCHANT_LIBRARY_PATH", cand)
        break

# Common short words allowed
ALLOWED_SHORT = {
    "a", "i", "an", "in", "on", "to", "of", "is", "as", "at", 
    "be", "he", "we", "us", "it", "or", "by"
}

# Common words fallback
COMMON_WORDS = {
    "the", "and", "to", "of", "in", "a", "that", "is", "it", "for", 
    "on", "with", "as", "at", "by", "an", "be", "this", "was", "are",
    "been", "have", "had", "were", "said", "each", "which", "she", "do",
    "how", "their", "if", "will", "up", "other", "about", "out", "many",
    "then", "them", "these", "so", "some", "her", "would", "make", "like",
    "him", "into", "time", "has", "look", "two", "more", "write", "go"
}


class WordValidator:
    """Word validation with multiple strategies"""
    
    def __init__(self):
        self.validator_func = self._setup_validator()
    
    def _setup_validator(self):
        """Setup the best available validation strategy"""
        # Try PyEnchant first
        try:
            import enchant
            en_dict = enchant.Dict("en_US")
            
            def enchant_validator(word: str) -> bool:
                clean = re.sub(r"[^A-Za-z']", "", word)
                if not clean:
                    return False
                wl = clean.lower()
                # Be strict about very short tokens
                if len(wl) <= 2 and wl not in ALLOWED_SHORT:
                    return False
                return en_dict.check(wl)
            
            return enchant_validator
            
        except Exception:
            pass
        
        # Try wordfreq as fallback
        try:
            from wordfreq import zipf_frequency
            
            def wordfreq_validator(word: str) -> bool:
                clean = re.sub(r"[^A-Za-z']", "", word).lower()
                if not clean:
                    return False
                if len(clean) <= 2 and clean not in ALLOWED_SHORT:
                    return False
                # Use a conservative threshold; common English words have zipf >= ~3.5
                return zipf_frequency(clean, "en") >= 3.3
            
            return wordfreq_validator
            
        except Exception:
            pass
        
        # Last resort: use common words whitelist
        def basic_validator(word: str) -> bool:
            wl = word.lower()
            return wl in COMMON_WORDS or wl in ALLOWED_SHORT
        
        return basic_validator
    
    def check_word(self, word: str) -> bool:
        """Check if a word is valid"""
        return self.validator_func(word)
    
    def validate_text(self, text: str) -> List[bool]:
        """Validate all words in text, returning mask of valid words"""
        words = text.split()
        return [self.check_word(word) for word in words]
    
    def get_valid_words(self, text: str) -> List[str]:
        """Get only valid words from text"""
        words = text.split()
        return [word for word in words if self.check_word(word)]
    
    def calculate_validity_score(self, text: str) -> float:
        """Calculate percentage of valid words in text"""
        words = text.split()
        if not words:
            return 100.0
        valid_count = sum(1 for word in words if self.check_word(word))
        return (valid_count / len(words)) * 100


# Global instance
_validator_instance = None

def get_validator() -> WordValidator:
    """Get or create validator instance"""
    global _validator_instance
    if _validator_instance is None:
        _validator_instance = WordValidator()
    return _validator_instance


def check_word(word: str) -> bool:
    """Convenience function to check a single word"""
    return get_validator().check_word(word)


def validate_text(text: str) -> List[bool]:
    """Convenience function to validate text"""
    return get_validator().validate_text(text)
