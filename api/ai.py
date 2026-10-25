"""
Vercel Serverless Function entry point for Python FastAPI AI Microservice.
"""
import sys
import os

# Insert ai-service directory into Python path
AI_SERVICE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ai-service'))
if AI_SERVICE_DIR not in sys.path:
    sys.path.insert(0, AI_SERVICE_DIR)

from main import app
