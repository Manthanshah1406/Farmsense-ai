"""
==========================================================
File: retriever.py

Purpose:
    This file is responsible for searching the Knowledge Base.

How it works:
    - Load the existing ChromaDB.
    - Search ChromaDB using the query from Decision Engine.
    - Keep only the chunks related to the predicted crop.
    - Return the final context which will be sent to Ollama.
==========================================================
"""

import os
import logging
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings

logger = logging.getLogger(__name__)

class RAGRetriever:
    def __init__(self, persist_directory: str):

        # Folder where ChromaDB is stored
        self.persist_directory = persist_directory

        # Embedding model used for semantic search
        self.embeddings = OllamaEmbeddings(model="nomic-embed-text")

        # This will hold the ChromaDB connection
        self.vector_store = None

        # Load ChromaDB when object is created
        self._init_store()

    def _init_store(self):
        """Load existing ChromaDB."""

        # Check whether ChromaDB folder exists
        if os.path.exists(self.persist_directory) and os.listdir(self.persist_directory):
            try:
                # Connect to existing ChromaDB
                self.vector_store = Chroma(
                    persist_directory=self.persist_directory,
                    embedding_function=self.embeddings
                )

                logger.info(f"Successfully loaded ChromaDB from {self.persist_directory}")

            except Exception as e:
                logger.error(f"Failed to load ChromaDB: {str(e)}")

        else:
            logger.warning(f"ChromaDB not found at {self.persist_directory}. Indexing might be required.")

    def search(self, query: str, k: int = 5, target_crop: str = "") -> str:
        """
        Search ChromaDB, remove unrelated crop chunks,
        and return the final context.
        """

        # If ChromaDB is not loaded then nothing can be searched
        if not self.vector_store:
            logger.warning("Vector store not initialized. Returning empty context.")
            return ""

        try:

            # Search ChromaDB and get Top-K similar chunks
            docs = self.vector_store.similarity_search(query, k=k)

            # No matching chunk found
            if not docs:
                return ""

            # Final list which will contain only valid crop chunks
            filtered_docs = []

            # Filter only when crop prediction is available
            if target_crop:

                # Convert crop name to lowercase for easy comparison
                target_lower = target_crop.lower().strip()

                # Different names used for the same crop
                CROP_ALIASES = {
                    "rice": ["rice", "paddy"],
                    "maize": ["maize", "corn"],
                    "groundnut": ["groundnut", "peanut"],
                    "cotton": ["cotton", "kapas"],
                    "wheat": ["wheat"],
                    "coffee": ["coffee"]
                }

                # Get aliases of predicted crop
                # If crop is not in dictionary, use only crop name
                aliases = CROP_ALIASES.get(target_lower, [target_lower])

                # Safety check to always keep original crop name
                #if there is no aliases in dict then it only contains crop itself like coffee:coffee 
                if target_lower not in aliases:
                    aliases.append(target_lower)

                # Check every retrieved chunk
                for doc in docs:

                    # Convert chunk to lowercase
                    doc_content_lower = doc.page_content.lower()

                    # Keep only those chunks which contain crop name or its alias
                    if any(alias in doc_content_lower for alias in aliases):
                        filtered_docs.append(doc)

            else:
                # If crop is not available then use all retrieved chunks
                filtered_docs = docs

            # If every chunk was removed after filtering
            if not filtered_docs:
                logger.info(f"All chunks filtered out. No relevant info found for crop: {target_crop}")
                return ""

            # Store formatted context here
            context_parts = []

            # Format every chunk with its source file name
            for i, doc in enumerate(filtered_docs):

                # Get PDF name from metadata
                source = doc.metadata.get("source", "Unknown Source")

                # Add source name and chunk content
                context_parts.append(
                    f"[Source {i+1}: {os.path.basename(source)}]\n{doc.page_content}\n"
                )

            # Join all chunks into one string and return it
            return "\n".join(context_parts)

        except Exception as e:

            # If any error happens during search
            logger.error(f"Error during semantic search: {str(e)}")
            return ""