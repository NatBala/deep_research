# 🧠 Deep Insights Assistant - Enhanced Web App

An AI-powered insights assistant with **real-time streaming**, **thinking mode**, and **OpenAI Deep Research-like experience** for AI topics.

## ✨ New Features

### 🧠 **AI Thinking Mode**
- **Real-time thinking displays** showing AI's reasoning process
- **Animated thinking indicators** with typing animations  
- **Step-by-step thought bubbles** revealing research strategy
- **Detailed planning** visualization like OpenAI's Deep Research

### 📊 **Enhanced Progress Streaming**
- **Granular progress updates** with smooth transitions
- **Live research section creation** with real-time previews
- **Dynamic query generation** showing actual search queries
- **Section-by-section completion** tracking with visual indicators

### 🎯 **Engaging User Experience**
- **WebSocket streaming** for instant updates
- **Research sections preview** during planning phase
- **Query details display** showing live search activity
- **Smooth animations** and professional UI design

## 🚀 Quick Start

### Prerequisites
- Python 3.10 or higher
- OpenAI API key
- Tavily API key (for web search)

### 1. Install Dependencies
```bash
# Install the package and dependencies
pip install -e .

# Install web app dependencies
pip install fastapi uvicorn websockets jinja2
```

### 2. Set Up API Keys

#### Option A: Environment Variables (Recommended)
```bash
# Windows PowerShell
$env:OPENAI_API_KEY="sk-your-openai-key-here"
$env:TAVILY_API_KEY="tvly-your-tavily-key-here"

# Windows Command Prompt
set OPENAI_API_KEY=sk-your-openai-key-here
set TAVILY_API_KEY=tvly-your-tavily-key-here

# Linux/Mac
export OPENAI_API_KEY="sk-your-openai-key-here"
export TAVILY_API_KEY="tvly-your-tavily-key-here"
```

#### Option B: .env File
Create a `.env` file in the root directory:
```env
OPENAI_API_KEY=sk-your-openai-key-here
TAVILY_API_KEY=tvly-your-tavily-key-here
```

### 3. Run the Enhanced Insights App
```bash
python real_research_app.py
```

### 4. Access the Web Interface
Open your browser and navigate to: **http://localhost:8000**

## 🎮 How to Use

### 1. **Enter AI Analysis Topic**
- Type your AI research topic in the input field
- Or click one of the example topic chips
- Examples: "Model Context Protocol Implementation", "Voice to Voice Agent Architecture"

### 2. **Watch AI Think & Research**
- **🚀 Initialization**: AI starts up and analyzes your topic
- **🤔 AI Thinking**: See the AI's reasoning and planning process
- **📋 Planning**: Watch as research sections are created
- **🔍 Query Generation**: View targeted search queries being generated
- **🌐 Web Research**: See real-time research progress for each section
- **✍️ Writing**: Watch as content is analyzed and written
- **📝 Final Report**: Comprehensive research compilation

### 3. **View Results**
- **Research Summary**: Overview with metadata
- **Final Report**: Professionally formatted research document
- **Download Options**: Copy or download the report

## 🛠 API Keys Setup

### Getting OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)

### Getting Tavily API Key
1. Go to [Tavily](https://tavily.com/)
2. Sign up for an account
3. Navigate to your dashboard
4. Copy your API key (starts with `tvly-`)

## 🏗 Architecture

### Backend (`real_research_app.py`)
- **FastAPI** web framework with WebSocket support
- **Real-time streaming** using LangGraph's `astream()`
- **Progress tracking** with detailed status updates
- **Error handling** and connection management

### Frontend
- **WebSocket communication** for real-time updates
- **Animated thinking displays** with CSS animations
- **Progressive disclosure** of research details
- **Responsive design** for all device sizes

### Research Engine
- **LangGraph workflow** with streaming capabilities
- **OpenAI GPT-4o** for AI reasoning and writing
- **Tavily search** for real-time web research
- **Parallel processing** for faster research completion

## 🎨 User Interface Features

### Real-time Progress
- **Smooth progress bars** with percentage indicators
- **Step-by-step tracking** with visual checkmarks
- **Status messages** with emojis and clear descriptions

### AI Thinking Display
- **Thought bubbles** showing AI reasoning
- **Typing indicators** with animated dots
- **Formatted thinking content** with markdown-like styling

### Research Previews
- **Section planning** with descriptions
- **Query lists** showing search strategies
- **Live updates** as research progresses

## 🔧 Troubleshooting

### Common Issues

#### "Connection not ready" Error
- Ensure the server is running on port 8000
- Check that no other applications are using the port
- Refresh the browser page

#### "No API key provided" Error
- Verify API keys are set correctly
- Check `.env` file exists and has correct format
- Restart the application after setting keys

#### WebSocket Connection Issues
- Check browser console for error messages
- Ensure firewall/antivirus isn't blocking WebSocket connections
- Try using `http://127.0.0.1:8000` instead of `localhost`

### Performance Tips
- **Close unused browser tabs** for better WebSocket performance
- **Ensure stable internet** for Tavily search functionality
- **Use latest browser version** for best WebSocket support

## 📁 File Structure

```
├── real_research_app.py          # Main enhanced web application
├── templates/
│   └── index.html                # Enhanced HTML template
├── static/
│   ├── app.js                    # Enhanced JavaScript with thinking mode
│   └── style.css                 # Enhanced CSS with animations
├── src/open_deep_research/       # Core research engine
├── .env                          # Environment variables (create this)
└── WEB_APP_GUIDE.md             # This guide
```

## 🚀 Advanced Usage

### Custom Configuration
Modify the research configuration in `real_research_app.py`:
```python
config = {
    "configurable": {
        "model_provider": "openai",
        "model_name": "gpt-4o",
        "search_api": "tavily",
        "number_of_queries_per_section": 3,  # Adjust query count
        "max_results_per_query": 5           # Adjust search depth
    }
}
```

### Running on Different Port
```bash
# Modify in real_research_app.py
uvicorn.run(app, host="0.0.0.0", port=8080, reload=False)
```

## 🤝 Contributing

This enhanced web app demonstrates:
- **Real-time AI research** with streaming updates
- **Engaging user experience** similar to OpenAI's Deep Research
- **Professional web interface** with modern design
- **Scalable architecture** using FastAPI and WebSockets

Feel free to extend and customize the interface for your specific research needs!

## 📞 Support

If you encounter any issues:
1. Check the **troubleshooting section** above
2. Verify **API keys** are correctly configured
3. Ensure **dependencies** are properly installed
4. Check the **browser console** for JavaScript errors

---

**Happy Researching!** 🔬✨ 