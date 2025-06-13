"""
Deep Research Web Application

A professional web interface for the simple research workflow with real-time progress updates.
"""

import asyncio
import json
import uuid
from datetime import datetime
from typing import Dict, Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
import uvicorn

from src.open_deep_research.simple_graph import simple_graph


app = FastAPI(title="Deep Research Assistant", description="AI-powered research with real-time progress")

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


manager = ConnectionManager()


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
                await run_research_with_updates(session_id, topic)
            elif message["type"] == "regenerate_section":
                await regenerate_section_with_feedback(session_id, message)
            
    except WebSocketDisconnect:
        manager.disconnect(session_id)


async def run_research_with_updates(session_id: str, topic: str):
    """Run the research workflow with real-time progress updates."""
    
    try:
        # Send initial status
        await manager.send_update(session_id, {
            "type": "status",
            "step": "initializing",
            "message": f"Starting research on: {topic}",
            "progress": 0
        })
        
        # Configuration
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
        
        # Step 1: Generate Initial Summary
        await manager.send_update(session_id, {
            "type": "status",
            "step": "planning",
            "message": "Analyzing topic and creating research outline...",
            "progress": 10
        })
        
        # Create a callback function to receive progress updates
        async def progress_callback(step: str, message: str, progress: int, details: dict = None):
            await manager.send_update(session_id, {
                "type": "status",
                "step": step,
                "message": message,
                "progress": progress,
                "details": details
            })
        
        # Add progress callback to config
        config["configurable"]["progress_callback"] = progress_callback
        
        # Run the actual research
        result = await simple_graph.ainvoke({"topic": topic}, config=config)
        
        # Send completion
        await manager.send_update(session_id, {
            "type": "complete",
            "step": "complete",
            "message": "Research completed successfully!",
            "progress": 100,
            "result": {
                "topic": topic,
                "sections": [
                    {
                        "name": sr["section_name"],
                        "queries": sr["queries"],
                        "summary": sr["summary"]
                    }
                    for sr in result["section_results"]
                ],
                "final_report": result["final_report"],
                "timestamp": datetime.now().isoformat()
            }
        })
        
    except Exception as e:
        await manager.send_update(session_id, {
            "type": "error",
            "message": f"Error during research: {str(e)}",
            "progress": 0
        })


async def regenerate_section_with_feedback(session_id: str, message: dict):
    """Regenerate a specific section based on user feedback."""
    
    try:
        section_title = message.get("section_title", "")
        section_content = message.get("section_content", "")
        feedback = message.get("feedback", "")
        topic = message.get("topic", "")
        
        if not all([section_title, feedback, topic]):
            await manager.send_update(session_id, {
                "type": "section_complete",
                "success": False,
                "error": "Missing required information for section regeneration"
            })
            return
        
        # Send initial status
        await manager.send_update(session_id, {
            "type": "status",
            "step": "regenerating",
            "message": f"Regenerating section: {section_title}",
            "progress": 0
        })
        
        # Import required modules for section regeneration
        from langchain.chat_models import init_chat_model
        from langchain_core.messages import HumanMessage, SystemMessage
        from pydantic import BaseModel, Field
        from typing import List
        from open_deep_research.utils import select_and_execute_search
        
        # Pydantic model for structured query generation
        class RegenerationQueries(BaseModel):
            """Queries for section regeneration based on feedback."""
            queries: List[str] = Field(description="List of search queries to address the feedback")
        
        # Initialize model
        model = init_chat_model(
            model="gpt-4o",
            model_provider="openai"
        )
        
        # Step 1: Generate new search queries based on feedback
        await manager.send_update(session_id, {
            "type": "status",
            "step": "regenerating",
            "message": "Generating new search queries based on feedback...",
            "progress": 25
        })
        
        query_system_prompt = """You are a research assistant. Based on user feedback about a section, generate 3-4 specific search queries that will help gather information to address the feedback and improve the section.

Focus on the specific improvements requested in the feedback."""

        query_user_prompt = f"""Topic: {topic}
Section Title: {section_title}
Original Section Content: {section_content}
User Feedback: {feedback}

Generate 3-4 specific search queries that will help address the feedback and improve this section."""

        structured_query_model = model.with_structured_output(RegenerationQueries)
        
        query_result = await structured_query_model.ainvoke([
            SystemMessage(content=query_system_prompt),
            HumanMessage(content=query_user_prompt)
        ])
        
        queries = query_result.queries
        
        # Step 2: Perform web search
        await manager.send_update(session_id, {
            "type": "status",
            "step": "regenerating",
            "message": "Searching for updated information...",
            "progress": 50
        })
        
        search_params = {"max_results": 5}
        search_results = await select_and_execute_search("tavily", queries, search_params)
        
        # Step 3: Regenerate the section
        await manager.send_update(session_id, {
            "type": "status",
            "step": "regenerating",
            "message": "Rewriting section with new information...",
            "progress": 75
        })
        
        regeneration_system_prompt = """You are a research analyst. Enhance and improve a research section based on user feedback and new search results.

The enhanced section should:
- KEEP the valuable content from the original section
- ENHANCE it by incorporating relevant information from the new search results
- ADDRESS the specific feedback provided by the user
- EXPAND on areas mentioned in the feedback
- Maintain the same structure and formatting as a research section
- Use proper markdown formatting with headers (###, ####)
- Be comprehensive and well-organized
- Focus on the improvements requested in the feedback while preserving good existing content
- IMPORTANT: Do NOT include conclusions, final thoughts, or summary statements
- Avoid phrases like "In conclusion", "Overall", "To summarize", etc.
- Structure content with clear subsections

Return ONLY the enhanced section content, not the entire report."""

        regeneration_user_prompt = f"""Topic: {topic}
Section Title: {section_title}
Original Section Content: {section_content}
User Feedback: {feedback}

New Search Results:
{search_results}

ENHANCE the original section by:
1. Keeping the valuable existing content
2. Adding new information from the search results that addresses the feedback
3. Expanding on areas mentioned in the feedback
4. Improving the overall quality and depth

Return the enhanced section with proper markdown formatting."""

        regenerated_result = await model.ainvoke([
            SystemMessage(content=regeneration_system_prompt),
            HumanMessage(content=regeneration_user_prompt)
        ])
        
        new_section_content = regenerated_result.content
        
        # Send completion
        await manager.send_update(session_id, {
            "type": "section_complete",
            "success": True,
            "section_title": section_title,
            "new_content": new_section_content,
            "message": f"Section '{section_title}' regenerated successfully!"
        })
        
    except Exception as e:
        await manager.send_update(session_id, {
            "type": "section_complete",
            "success": False,
            "section_title": message.get("section_title", ""),
            "error": f"Error regenerating section: {str(e)}"
        })


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True) 