# Deep Research Assistant - Web Application

A professional web interface for AI-powered research with real-time progress tracking, similar to OpenAI's deep research UI.

![Deep Research Assistant](https://img.shields.io/badge/AI-Research-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-Web%20Framework-green)
![WebSocket](https://img.shields.io/badge/WebSocket-Real%20Time-orange)

## Features

- 🔍 **Intelligent Research**: AI-powered research with 3-section analysis
- 📊 **Real-time Progress**: Live updates showing research steps
- 🎨 **Professional UI**: Clean, modern interface similar to OpenAI
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile
- 📄 **Markdown Output**: Formatted reports in markdown
- 📥 **Export Options**: Copy to clipboard or download as file
- ⚡ **WebSocket Updates**: Real-time progress without page refresh

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements-web.txt
```

### 2. Set API Keys

Set your API keys as environment variables:

```bash
# Windows
set OPENAI_API_KEY=your_openai_api_key_here
set TAVILY_API_KEY=your_tavily_api_key_here

# Linux/Mac
export OPENAI_API_KEY=your_openai_api_key_here
export TAVILY_API_KEY=your_tavily_api_key_here
```

### 3. Run the Application

```bash
python run_web_app.py
```

Or directly with uvicorn:

```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### 4. Access the Web Interface

Open your browser and go to: **http://localhost:8000**

## How to Use

1. **Enter Research Topic**: Type your research topic in the input field
2. **Start Research**: Click "Start Research" or press Enter
3. **Watch Progress**: View real-time updates as the AI researches
4. **Review Results**: Read the comprehensive report
5. **Export**: Copy to clipboard or download as markdown file

### Example Topics

Try these example research topics:
- "Artificial Intelligence in Healthcare"
- "Climate Change Impact on Agriculture" 
- "Blockchain Technology Applications"
- "Remote Work Trends 2024"

## Research Process

The application follows a structured 5-step research process:

1. **📋 Planning**: Creates research outline with 3 sections
2. **🔍 Query Generation**: Generates targeted search queries
3. **🌐 Web Research**: Searches reliable sources for information
4. **✍️ Content Writing**: Analyzes data and writes detailed sections
5. **📄 Final Report**: Compiles comprehensive research report

## UI Components

### Input Section
- **Topic Input**: Multi-line text area for research topics
- **Example Chips**: Quick-start buttons with sample topics
- **Research Button**: Animated button to start research

### Progress Section
- **Progress Bar**: Visual progress indicator (0-100%)
- **Current Step**: Shows current research phase
- **Status Message**: Detailed status updates
- **Step Tracker**: Visual checklist of research steps

### Results Section
- **Research Summary**: Metadata about the completed research
- **Action Buttons**: Copy, download, and new research options
- **Report Display**: Toggle between rendered and raw markdown
- **Export Options**: Multiple ways to save/share results

## Technical Architecture

- **Backend**: FastAPI with WebSocket support
- **Frontend**: Vanilla JavaScript with modern CSS
- **Real-time**: WebSocket connection for live updates
- **Styling**: Professional gradient design with animations
- **Responsive**: Mobile-first responsive design
- **Markdown**: Marked.js for rendering markdown content

## API Endpoints

- `GET /`: Main application page
- `WebSocket /ws/{session_id}`: Real-time research updates

## Configuration

The application uses the same configuration as the simple research workflow:

- **Model**: OpenAI GPT-4o
- **Search**: Tavily API
- **Sections**: 3 research sections
- **Queries**: 3 queries per section
- **Results**: 5 results per query

## Customization

### Styling
Edit `static/style.css` to customize the appearance:
- Colors and gradients
- Fonts and typography
- Animations and transitions
- Responsive breakpoints

### Functionality
Edit `static/app.js` to modify:
- WebSocket handling
- UI interactions
- Progress updates
- Error handling

### Backend
Edit `app.py` to customize:
- Research workflow
- Progress reporting
- WebSocket messages
- Configuration options

## Troubleshooting

### Common Issues

1. **Connection Error**: Check that API keys are set correctly
2. **WebSocket Timeout**: Refresh the page if connection is lost
3. **Progress Stuck**: Check internet connection and API limits
4. **Styling Issues**: Clear browser cache and reload

### Debug Mode

Run with debug logging:

```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload --log-level debug
```

## Dependencies

- `fastapi`: Web framework
- `uvicorn`: ASGI server
- `jinja2`: Template engine
- `websockets`: Real-time communication
- `python-multipart`: Form handling

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Performance

- **Startup Time**: ~2 seconds
- **Research Time**: 30-60 seconds (depending on topic complexity)
- **Memory Usage**: ~50MB base + research data
- **Concurrent Users**: Supports multiple simultaneous research sessions

## Security

- No sensitive data stored locally
- API keys handled through environment variables
- WebSocket connections isolated by session ID
- No file system access from web interface

## Contributing

To contribute to the web application:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the Open Deep Research toolkit and follows the same license terms.

---

**Need Help?** Open an issue on GitHub or check the main README for more information. 