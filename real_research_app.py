#!/usr/bin/env python3
"""
Deep Insights App - Deep Insights Assistant with Actual AI Research

This version uses real OpenAI and Tavily APIs to conduct actual AI insights research.
"""

import asyncio
import json
import uuid
import sys
import os
from datetime import datetime
from typing import Dict

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("Warning: python-dotenv not installed. Environment variables must be set manually.")

# Add the src directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

try:
    from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
    from fastapi.staticfiles import StaticFiles
    from fastapi.templating import Jinja2Templates
    from fastapi.responses import HTMLResponse
    import uvicorn
    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False

try:
    from open_deep_research.simple_graph import simple_graph
    from tavily import TavilyClient
    from openai import OpenAI
    RESEARCH_AVAILABLE = True
except ImportError as e:
    RESEARCH_AVAILABLE = False
    print(f"Warning: Research modules not available: {e}")


if FASTAPI_AVAILABLE:
    app = FastAPI(title="Deep Insights Assistant - AI Analysis", description="AI-powered insights with real-time progress")
    
    # Mount static files and templates
    app.mount("/static", StaticFiles(directory="static"), name="static")
    templates = Jinja2Templates(directory="templates")


class ConnectionManager:
    """Manages WebSocket connections for real-time updates."""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket
    
    def disconnect(self, session_id: str):
        if session_id in self.active_connections:
            del self.active_connections[session_id]
    
    async def send_update(self, session_id: str, data: dict):
        if session_id in self.active_connections:
            try:
                await self.active_connections[session_id].send_text(json.dumps(data))
            except:
                self.disconnect(session_id)


if FASTAPI_AVAILABLE:
    manager = ConnectionManager()


async def run_real_research(session_id: str, topic: str):
    """Run actual research using the simple_graph workflow with real-time streaming updates."""
    
    try:
        if not RESEARCH_AVAILABLE:
            await manager.send_update(session_id, {
                "type": "error",
                "message": "Research modules not available. Please check your setup.",
                "progress": 0
            })
            return
            
        # Initialize
        await manager.send_update(session_id, {
            "type": "status",
            "step": "initializing",
            "message": f"🚀 Starting AI analysis on: {topic}",
            "progress": 5
        })
        
        # Configuration for the research
        config = {
            "configurable": {
                "thread_id": str(uuid.uuid4()),
                "model_provider": "openai",
                "model_name": "gpt-4o",
                "search_api": "tavily",
                "number_of_queries_per_section": 3,
                "max_results_per_query": 5
            }
        }
        
        # Track progress and intermediate results
        current_progress = 5
        sections_found = {}
        section_queries = {}
        section_summaries = {}
        all_sources = []  # Track all sources used in the research
        
        # Stream through the workflow
        async for chunk in simple_graph.astream({"topic": topic}, config=config):
            node_name = list(chunk.keys())[0]
            node_output = chunk[node_name]
            
            if node_name == "generate_initial_summary":
                current_progress = 20
                sections = node_output.get("initial_sections", {})
                sections_found = sections
                
                await manager.send_update(session_id, {
                    "type": "status",
                    "step": "planning",
                    "message": f"📋 Analysis plan created with {len(sections)} sections",
                    "progress": current_progress,
                    "details": {
                        "sections": [{"name": k, "description": v} for k, v in sections.items()]
                    }
                })
                
                await manager.send_update(session_id, {
                    "type": "thinking",
                    "message": f"🤔 Planning comprehensive analysis approach...\n\n" +
                              f"**Identified Key Areas:**\n" +
                              "\n".join([f"• **{k}:** {v}" for k, v in sections.items()]),
                    "progress": current_progress
                })
                
            elif node_name == "process_section":
                # Section processing completed
                section_results = node_output.get("section_results", [])
                if section_results:
                    section_result = section_results[0]  # Get the single section result
                    section_name = section_result["section_name"]
                    queries = section_result["queries"]
                    summary = section_result["summary"]
                    
                    section_queries[section_name] = queries
                    section_summaries[section_name] = summary
                    
                    # Update progress based on completed sections
                    completed_sections = len(section_summaries)
                    total_sections = len(sections_found) if sections_found else 3
                    current_progress = 20 + (completed_sections * 50 // total_sections)
                    
                    await manager.send_update(session_id, {
                        "type": "status", 
                        "step": "researching",
                        "message": f"🔍 Completed analysis for: {section_name}",
                        "progress": current_progress,
                        "details": {
                            "section": section_name,
                            "queries": queries,
                            "completed": completed_sections,
                            "total": total_sections
                        }
                    })
                    
                    await manager.send_update(session_id, {
                        "type": "thinking",
                        "message": f"🔬 **Deep diving into {section_name}**\n\n" +
                                  f"**Search Queries Generated:**\n" +
                                  "\n".join([f"• {q}" for q in queries]) +
                                  f"\n\n**Key Findings:** Analysis data collected and processed...",
                        "progress": current_progress
                    })
                    
            elif node_name == "generate_final_report":
                current_progress = 90
                await manager.send_update(session_id, {
                    "type": "status",
                    "step": "finalizing",
                    "message": "📝 Compiling comprehensive analysis report...",
                    "progress": current_progress
                })
                
                await manager.send_update(session_id, {
                    "type": "thinking",
                    "message": "✍️ **Synthesizing Analysis Findings**\n\n" +
                              "• Processing collected data from all sections\n" +
                              "• Creating executive summary\n" +
                              "• Structuring final comprehensive report\n" +
                              "• Adding conclusions and insights",
                    "progress": current_progress
                })
                
                final_report = node_output.get("final_report", "")
                
                # Complete
                await manager.send_update(session_id, {
                    "type": "complete",
                    "step": "complete",
                    "message": "✅ AI Analysis completed successfully!",
                    "progress": 100,
                    "result": {
                        "topic": topic,
                        "sections": [
                            {
                                "name": name,
                                "queries": section_queries.get(name, []),
                                "summary": section_summaries.get(name, "")
                            }
                            for name in sections_found.keys()
                        ],
                        "final_report": final_report,
                        "timestamp": datetime.now().isoformat()
                    }
                })
        
    except Exception as e:
        await manager.send_update(session_id, {
            "type": "error",
            "message": f"Research error: {str(e)}",
            "progress": 0
        })


async def regenerate_section(session_id: str, section_title: str, section_content: str, feedback: str, topic: str):
    """Regenerate a specific section based on user feedback - FAST VERSION."""
    try:
        if not RESEARCH_AVAILABLE:
            await manager.send_update(session_id, {
                "type": "section_complete",
                "success": False,
                "error": "Research modules not available",
                "section_title": section_title
            })
            return
            
        # Send status update
        await manager.send_update(session_id, {
            "type": "status",
            "step": "regenerating",
            "message": f"🔄 Regenerating section: {section_title}",
            "progress": 25
        })
        
        # Send thinking update
        await manager.send_update(session_id, {
            "type": "thinking",
            "message": f"🎯 **Quick Section Regeneration: {section_title}**\n\n" +
                      f"**User Feedback:** {feedback}\n\n" +
                      f"**Action:** Performing targeted search and content generation...",
        })
        
        # Step 1: Quick targeted research (2 queries max)
        await manager.send_update(session_id, {
            "type": "status",
            "step": "researching",
            "message": f"🔍 Gathering focused information...",
            "progress": 50
        })
        
        # Initialize clients directly (imports already at top)
        tavily_client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))
        openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # Generate 2 focused search queries
        query_prompt = f"""
        Generate 2 highly specific search queries to improve this section based on user feedback.
        
        Topic: {topic}
        Section Title: {section_title}
        Current Content: {section_content[:300]}...
        User Feedback: {feedback}
        
        Return only the queries, one per line, no numbering:
        """
        
        query_response = openai_client.chat.completions.create(
            model="gpt-4o-mini",  # Use faster model for query generation
            messages=[{"role": "user", "content": query_prompt}],
            max_tokens=100,
            temperature=0.3
        )
        
        queries = [q.strip() for q in query_response.choices[0].message.content.strip().split('\n') if q.strip()][:2]
        
        # Step 2: Search for information
        await manager.send_update(session_id, {
            "type": "thinking",
            "message": f"🔍 **Targeted Research Queries:**\n" +
                      "\n".join([f"• {q}" for q in queries]) +
                      f"\n\n**Gathering specific information...**",
        })
        
        search_results = []
        for query in queries:
            try:
                result = tavily_client.search(
                    query=query,
                    search_depth="basic",
                    max_results=3  # Fewer results for speed
                )
                results = result.get('results', [])
                search_results.extend(results)
                        
            except Exception as e:
                print(f"Search error for query '{query}': {e}")
                continue
        
        # Step 3: Generate improved content
        await manager.send_update(session_id, {
            "type": "status",
            "step": "writing",
            "message": f"✍️ Generating improved content...",
            "progress": 75
        })
        
        # Prepare research data
        research_context = "\n\n".join([
            f"Source: {result.get('title', 'Unknown')}\n{result.get('content', '')[:500]}..."
            for result in search_results[:5]  # Limit context for speed
        ])
        
        # Generate improved section content
        improvement_prompt = f"""
        You are an AI research assistant. ENHANCE the following section based on user feedback while PRESERVING the original content.
        
        ORIGINAL SECTION:
        Title: {section_title}
        Content: {section_content}
        
        USER FEEDBACK: {feedback}
        
        RESEARCH DATA:
        {research_context}
        
        INSTRUCTIONS:
        1. PRESERVE all valuable content from the original section
        2. ENHANCE the section by adding new information based on the feedback
        3. INTEGRATE the research data to address the specific feedback
        4. EXPAND sections that need more detail based on feedback
        5. ADD examples, details, or explanations as requested
        6. MAINTAIN the original structure and tone
        7. DO NOT remove existing information unless it contradicts new findings
        8. DO NOT add conclusions, summary statements, or "Overall" remarks
        9. Focus on factual content and information presentation
        10. Use markdown formatting with clear subsections (### headers)
        11. Organize content into 3-4 subsections with descriptive headers
        12. Structure content professionally with headers and subheaders
        
        Return the ENHANCED section that builds upon the original WITHOUT concluding statements:
        """
        
        content_response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": improvement_prompt}],
            max_tokens=800,  # Limit tokens for speed
            temperature=0.7
        )
        
        new_section_content = content_response.choices[0].message.content.strip()
        
        # Send completion
        await manager.send_update(session_id, {
            "type": "section_complete",
            "success": True,
            "section_title": section_title,
            "new_content": new_section_content,
            "message": f"✅ Section '{section_title}' regenerated successfully!"
        })
        
    except Exception as e:
        await manager.send_update(session_id, {
            "type": "section_complete",
            "success": False,
            "error": str(e),
            "section_title": section_title
        })


if FASTAPI_AVAILABLE:
    @app.get("/", response_class=HTMLResponse)
    async def home(request: Request):
        """Serve the main application page."""
        return templates.TemplateResponse("index.html", {"request": request})

    @app.websocket("/ws/{session_id}")
    async def websocket_endpoint(websocket: WebSocket, session_id: str):
        """WebSocket endpoint for real-time research updates."""
        await manager.connect(websocket, session_id)
        
        try:
            while True:
                # Wait for messages from client
                data = await websocket.receive_text()
                message = json.loads(data)
                
                if message["type"] == "start_research":
                    topic = message["topic"]
                    # Run real research instead of simulation
                    await run_real_research(session_id, topic)
                    
                elif message["type"] == "regenerate_section":
                    section_title = message["section_title"]
                    section_content = message["section_content"]
                    feedback = message["feedback"]
                    topic = message["topic"]
                    # Run section regeneration
                    await regenerate_section(session_id, section_title, section_content, feedback, topic)
                
        except WebSocketDisconnect:
            manager.disconnect(session_id)


def main():
    """Main function to run the application."""
    if not FASTAPI_AVAILABLE:
        print("Error: FastAPI and related dependencies are not installed.")
        print("Please install them with: pip install fastapi uvicorn websockets jinja2")
        return
    
    print("\n" + "="*60)
    print("🧠 DEEP INSIGHTS ASSISTANT - AI ANALYSIS")
    print("="*60)
    print(f"✅ FastAPI: Available")
    print(f"{'✅' if RESEARCH_AVAILABLE else '❌'} Analysis Engine: {'Available' if RESEARCH_AVAILABLE else 'Not Available'}")
    print("\n📱 Starting web server...")
    print("🌐 Open your browser and go to: http://localhost:8000")
    print("🔬 This version conducts REAL AI analysis using OpenAI + Tavily")
    print("="*60)
    
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)


if __name__ == "__main__":
    main() 