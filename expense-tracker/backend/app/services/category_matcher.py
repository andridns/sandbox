"""
Smart category matching service using keyword-based algorithm
"""
import logging
from typing import Optional, Dict, List
from sqlalchemy.orm import Session
from app.models.category import Category
from app.models.expense import Expense
import re

logger = logging.getLogger(__name__)


class CategoryMatcher:
    """Smart category matcher using keyword-based matching"""
    
    def __init__(self, db: Session):
        self.db = db
        self.categories: List[Category] = []
        self.keyword_map: Dict[str, List[str]] = {}
        logger.debug("Initializing CategoryMatcher")
        self._load_categories()
        self._build_keyword_map()
        logger.info(f"CategoryMatcher initialized with {len(self.categories)} categories")
    
    def _load_categories(self):
        """Load all categories from database"""
        logger.debug("Loading categories from database")
        self.categories = self.db.query(Category).all()
        logger.debug(f"Loaded {len(self.categories)} categories")
    
    def _build_keyword_map(self):
        """Build keyword dictionary for each category"""
        logger.debug("Building keyword map for categories")
        # Pre-defined keywords for common categories (English and Indonesian)
        predefined_keywords = {
            "Food & Dining": [
                "food", "restaurant", "cafe", "coffee", "lunch", "dinner", "breakfast",
                "makan", "restoran", "kafe", "kopi", "makan siang", "makan malam", "sarapan",
                "warung", "bakso", "nasi", "mie", "ayam", "ikan", "daging"
            ],
            "Transportation": [
                "transport", "taxi", "grab", "gojek", "uber", "bus", "train", "flight",
                "transportasi", "taksi", "ojek", "kereta", "pesawat", "bensin", "gas",
                "parking", "parkir", "tol", "toll"
            ],
            "Shopping": [
                "shop", "shopping", "mall", "store", "market", "supermarket", "grocery",
                "belanja", "toko", "mall", "pasar", "supermarket", "swalayan"
            ],
            "Bills & Utilities": [
                "bill", "utility", "electricity", "water", "internet", "phone", "electric",
                "tagihan", "listrik", "air", "internet", "telepon", "pdam", "pln"
            ],
            "Entertainment": [
                "entertainment", "movie", "cinema", "concert", "game", "netflix", "spotify",
                "hiburan", "film", "bioskop", "konser", "game", "tiket"
            ],
            "Healthcare": [
                "health", "healthcare", "doctor", "hospital", "pharmacy", "medicine", "clinic",
                "kesehatan", "dokter", "rumah sakit", "apotek", "obat", "klinik", "medical"
            ],
            "Education": [
                "education", "school", "university", "course", "book", "tuition", "learning",
                "pendidikan", "sekolah", "universitas", "kursus", "buku", "belajar"
            ],
            "Personal Care": [
                "personal care", "haircut", "salon", "spa", "beauty", "skincare", "cosmetic",
                "perawatan", "potong rambut", "salon", "spa", "kecantikan", "skincare"
            ],
            "Travel": [
                "travel", "hotel", "flight", "ticket", "vacation", "trip", "holiday",
                "perjalanan", "hotel", "pesawat", "tiket", "liburan", "wisata"
            ],
            "Gifts & Donations": [
                "gift", "donation", "charity", "present", "birthday", "wedding",
                "hadiah", "donasi", "amal", "kado", "ulang tahun", "pernikahan"
            ],
            "Subscriptions": [
                "subscription", "netflix", "spotify", "youtube", "premium", "membership",
                "langganan", "berlangganan", "premium", "keanggotaan"
            ],
        }
        
        # Build keyword map from predefined keywords
        for category in self.categories:
            category_name = category.name
            keywords = predefined_keywords.get(category_name, [])
            logger.debug(f"Category '{category_name}': Found {len(keywords)} predefined keywords")
            
            # Also learn from existing categorized expenses
            existing_expenses = self.db.query(Expense).filter(
                Expense.category_id == category.id
            ).limit(100).all()
            logger.debug(f"Category '{category_name}': Found {len(existing_expenses)} existing expenses")
            
            # Extract common words from existing expense descriptions
            description_words = []
            for expense in existing_expenses:
                words = self._extract_words(expense.description)
                description_words.extend(words)
            
            # Add most common words (appearing in at least 2 expenses)
            from collections import Counter
            word_counts = Counter(description_words)
            common_words = [word for word, count in word_counts.items() if count >= 2 and len(word) > 3]
            keywords.extend(common_words[:10])  # Add top 10 common words
            logger.debug(f"Category '{category_name}': Added {len(common_words[:10])} learned keywords")
            
            self.keyword_map[category_name] = list(set(keywords))  # Remove duplicates
            logger.debug(f"Category '{category_name}': Total keywords: {len(self.keyword_map[category_name])}")
        
        logger.info(f"Keyword map built for {len(self.keyword_map)} categories")
    
    def _extract_words(self, text: str) -> List[str]:
        """Extract words from text, normalized"""
        if not text:
            return []
        
        # Normalize: lowercase, remove special chars except spaces
        normalized = re.sub(r'[^\w\s]', ' ', text.lower())
        words = normalized.split()
        
        # Filter out very short words and common stop words
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'}
        return [w for w in words if len(w) > 2 and w not in stop_words]
    
    def match(self, description: str) -> Optional[Category]:
        """
        Match expense description to a category using keyword matching
        
        Args:
            description: Expense description text
            
        Returns:
            Best matching Category or None if no match found
        """
        logger.debug(f"Matching description: '{description[:100]}'")
        
        if not description:
            logger.debug("Empty description, returning None")
            return None
        
        # Normalize description
        normalized_desc = description.lower()
        desc_words = self._extract_words(description)
        logger.debug(f"Extracted {len(desc_words)} words from description: {desc_words[:10]}")
        
        if not desc_words:
            logger.debug("No words extracted, returning None")
            return None
        
        best_match = None
        best_score = 0
        
        # Score each category
        for category in self.categories:
            keywords = self.keyword_map.get(category.name, [])
            if not keywords:
                continue
            
            score = 0
            
            # Check for exact keyword matches
            for keyword in keywords:
                keyword_lower = keyword.lower()
                
                # Exact word match (higher score)
                if keyword_lower in desc_words:
                    score += 3
                    logger.debug(f"Category '{category.name}': Exact keyword match '{keyword}' (+3)")
                # Partial match (lower score)
                elif keyword_lower in normalized_desc:
                    score += 1
                    logger.debug(f"Category '{category.name}': Partial keyword match '{keyword}' (+1)")
            
            # Check if category name appears in description
            category_words = self._extract_words(category.name)
            for cat_word in category_words:
                if cat_word in desc_words:
                    score += 2
                    logger.debug(f"Category '{category.name}': Category word match '{cat_word}' (+2)")
            
            if score > best_score:
                best_score = score
                best_match = category
                logger.debug(f"Category '{category.name}': New best match with score {score}")
        
        # Only return match if score is above threshold
        if best_score >= 2:
            logger.info(f"Matched '{description[:50]}' to category '{best_match.name}' with score {best_score}")
            return best_match
        
        logger.debug(f"No match found for '{description[:50]}' (best score: {best_score}, threshold: 2)")
        return None
