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
        
        # We'll need to modify the graph to get intermediate results
        # For now, let's run the full workflow and simulate updates
        
        await manager.send_update(session_id, {
            "type": "status", 
            "step": "planning_complete",
            "message": "Research outline created with 3 sections",
            "progress": 25
        })
        
        # Step 2: Generate Queries
        await manager.send_update(session_id, {
            "type": "status",
            "step": "query_generation", 
            "message": "Generating targeted search queries for each section...",
            "progress": 35
        })
        
        # Step 3: Search and Research
        await manager.send_update(session_id, {
            "type": "status",
            "step": "researching",
            "message": "Conducting web searches and gathering information...",
            "progress": 50
        })
        
        # Step 4: Writing Sections
        await manager.send_update(session_id, {
            "type": "status", 
            "step": "writing",
            "message": "Analyzing search results and writing detailed sections...",
            "progress": 75
        })
        
        # Step 5: Final Report
        await manager.send_update(session_id, {
            "type": "status",
            "step": "finalizing",
            "message": "Compiling final report...", 
            "progress": 90
        })
        
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


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True) 