"""
==========================================================
File: decision_engine.py

What:
    The central coordinator of the AI module.

Why:
    We need a single entry point that orchestrates data collection
    (ML, Weather, History, RAG context) and queries the LLM to get
    a final decision.

Responsibilities:
    - Receive inputs (ML predictions, Weather, History, Query)
    - Fetch relevant context from RAG Retriever
    - Use Prompt Builder to construct the prompt
    - Call Ollama Service to generate the response
    - Return the final structured recommendation
==========================================================
"""

import os
import logging
from pathlib import Path
from django.conf import settings

from ai.rag.indexer import PDFIndexer
from ai.rag.retriever import RAGRetriever
from ai.decision_engine.prompt_builder import prompt_builder
from ai.decision_engine.ollama_service import ollama_service

logger = logging.getLogger(__name__)

class DecisionEngine:
    def __init__(self):
        # Determine the knowledge base and chromadb persist paths
        base_dir = Path(__file__).resolve().parent.parent
        self.knowledge_base_dir = os.path.join(base_dir, "knowledge_base")
        self.persist_directory = os.path.join(base_dir, "chroma_db")

        # Initialize the RAG components
        self.indexer = PDFIndexer(self.knowledge_base_dir, self.persist_directory)
        self.retriever = None

    def initialize_rag(self):
        """Index the knowledge base if not already done, and initialize retriever."""
        if not self.indexer.is_indexed():
            logger.info("Initializing knowledge base indexing for the first time...")
            print("\n[AI Module] Indexing Knowledge Base for the first time. This will take a while...")
            self.indexer.index_documents()
        else:
            print("\n[AI Module] Knowledge base already indexed. Skipping storage phase!")
        
        # Only initialize retriever after ensuring indexing is done (or already exists)
        if self.retriever is None:
            self.retriever = RAGRetriever(self.persist_directory)

    def generate_recommendation(self, user_query: str, ml_predictions: dict, weather: dict, history: dict) -> dict:
        """
        Coordinates the entire recommendation generation process.
        """
        print("\n[AI Module] Starting AI Recommendation Pipeline...")
        # before searching in pdfs make sure rag is ready like connect to chromaDB,embedding model,retriver
        # start ai system and load knowledge 
        self.initialize_rag()

        # Retrieve relevant context using the user query.
        crop = ml_predictions.get('recommended_crop', 'Unknown Crop')
        fertilizer = ml_predictions.get('recommended_fertilizer', '')
        irrigation = ml_predictions.get('irrigation_need', '')
        yield_val = ml_predictions.get('predicted_yield', '')

        # Construct a targeted retrieval query based on user intent
        user_q_lower = user_query.lower() if user_query else ""
        
        if any(kw in user_q_lower for kw in ["disease", "pest", "sick", "fungus", "blight"]):
            search_query = f"{crop} disease prevention pests management {user_query}"
        elif any(kw in user_q_lower for kw in ["fertilizer", "nutrient", "npk", "urea", "compost"]):
            search_query = f"{crop} {fertilizer} fertilizer nutrient application {user_query}"
        elif any(kw in user_q_lower for kw in ["irrigation", "water", "drip", "sprinkler"]):
            search_query = f"{crop} {irrigation} irrigation water management {user_query}"
        elif any(kw in user_q_lower for kw in ["rotation", "next crop"]):
            search_query = f"{crop} crop rotation sequence {user_query}"
        else:
            search_query = f"{crop} farming best practices {crop} yield {yield_val} {user_query}".strip()

        print(f"[AI Module] Searching Knowledge Base for: '{search_query}'...")
        rag_context = self.retriever.search(search_query, k=5, target_crop=crop)

        # Build prompt
        print("[AI Module] Building Prompt...")
        prompt = prompt_builder.build(
            user_query=user_query,
            ml_predictions=ml_predictions,
            weather=weather,
            history=history,
            rag_context=rag_context
        )

        # Generate response from LLM
        print("[AI Module] Asking Ollama (qwen2.5:7b). This may take a minute depending on your hardware...")
        response = ollama_service.generate_response(prompt)
        print("[AI Module] Successfully generated AI response!")

        return response

decision_engine = DecisionEngine()
