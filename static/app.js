/**
 * Deep Research Assistant - Frontend JavaScript
 * Handles WebSocket connections, UI updates, and user interactions
 */

class ResearchApp {
    constructor() {
        this.ws = null;
        this.sessionId = this.generateSessionId();
        this.isResearching = false;
        this.currentTopic = '';
        this.finalReport = '';
        
        this.init();
    }
    
    generateSessionId() {
        return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }
    
    init() {
        this.setupEventListeners();
        this.setupWebSocket();
    }
    
    setupEventListeners() {
        // Start research button
        const startBtn = document.getElementById('start-research-btn');
        const topicInput = document.getElementById('topic-input');
        
        startBtn.addEventListener('click', () => this.startResearch());
        
        // Enter key in textarea
        topicInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.startResearch();
            }
        });
        
        // Topic chips
        document.querySelectorAll('.topic-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                const topic = e.target.getAttribute('data-topic');
                topicInput.value = topic;
                this.startResearch();
            });
        });
        
        // Action buttons
        document.getElementById('copy-report-btn').addEventListener('click', () => this.copyReport());
        document.getElementById('download-report-btn').addEventListener('click', () => this.downloadReport());
        document.getElementById('new-research-btn').addEventListener('click', () => this.resetApp());
        document.getElementById('retry-btn').addEventListener('click', () => this.retryResearch());
        
        // Toggle raw markdown
        document.getElementById('toggle-raw-btn').addEventListener('click', () => this.toggleRawMarkdown());
    }
    
    setupWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/${this.sessionId}`;
        
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('WebSocket connected');
        };
        
        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            if (this.isResearching) {
                this.showError('Connection lost. Please refresh the page and try again.');
            }
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            if (this.isResearching) {
                this.showError('Connection error. Please check your internet connection.');
            }
        };
    }
    
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'status':
                this.updateProgress(data);
                break;
            case 'thinking':
                this.showThinking(data);
                break;
            case 'complete':
                this.showResults(data);
                break;
            case 'error':
                this.showError(data.message);
                break;
        }
    }
    
    startResearch() {
        const topicInput = document.getElementById('topic-input');
        const topic = topicInput.value.trim();
        
        if (!topic) {
            this.showToast('Please enter a research topic', 'error');
            return;
        }
        
        if (this.isResearching) {
            return;
        }
        
        this.currentTopic = topic;
        this.isResearching = true;
        
        // Update UI
        this.showSection('progress-section');
        this.hideSection('input-section');
        this.hideSection('results-section');
        this.hideSection('error-section');
        
        // Reset progress
        this.resetProgress();
        
        // Send research request
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'start_research',
                topic: topic
            }));
        } else {
            this.showError('Connection not ready. Please refresh the page and try again.');
        }
    }
    
    updateProgress(data) {
        // Update progress bar
        const progressFill = document.getElementById('progress-fill');
        const progressPercent = document.getElementById('progress-percent');
        
        progressFill.style.width = `${data.progress}%`;
        progressPercent.textContent = `${data.progress}%`;
        
        // Update current step
        document.getElementById('current-step').textContent = this.getStepTitle(data.step);
        document.getElementById('status-message').textContent = data.message;
        
        // Update step status
        this.updateStepStatus(data.step);
        
        // Clear thinking content when new status arrives
        this.clearThinking();
        
        // Show detailed info if available
        if (data.details) {
            this.showDetailedProgress(data.details);
        }
    }
    
    showThinking(data) {
        const thinkingContainer = document.getElementById('thinking-container');
        const thinkingContent = document.getElementById('thinking-content');
        
        if (thinkingContainer && thinkingContent) {
            thinkingContent.innerHTML = this.formatThinkingContent(data.message);
            thinkingContainer.style.display = 'block';
            
            // Add typing animation
            thinkingContainer.classList.add('thinking-active');
            
            // Auto-scroll to thinking content
            thinkingContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
    
    clearThinking() {
        const thinkingContainer = document.getElementById('thinking-container');
        if (thinkingContainer) {
            thinkingContainer.classList.remove('thinking-active');
            // Don't hide immediately to maintain reading experience
            setTimeout(() => {
                if (!thinkingContainer.classList.contains('thinking-active')) {
                    thinkingContainer.style.display = 'none';
                }
            }, 1000);
        }
    }
    
    formatThinkingContent(content) {
        // Convert markdown-like formatting to HTML
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>')
            .replace(/^• /gm, '<span class="bullet">•</span> ');
    }
    
    showDetailedProgress(details) {
        if (details.sections) {
            this.updateSectionsList(details.sections);
        }
        if (details.queries) {
            this.showQueryDetails(details.section, details.queries);
        }
    }
    
    updateSectionsList(sections) {
        const sectionsContainer = document.getElementById('sections-preview');
        if (sectionsContainer) {
            sectionsContainer.innerHTML = sections.map(section => 
                `<div class="section-preview">
                    <h4>${section.name}</h4>
                    <p>${section.description}</p>
                </div>`
            ).join('');
            sectionsContainer.style.display = 'block';
        }
    }
    
    showQueryDetails(sectionName, queries) {
        const queriesContainer = document.getElementById('current-queries');
        if (queriesContainer) {
            queriesContainer.innerHTML = `
                <h4>🔍 Researching: ${sectionName}</h4>
                <ul class="query-list">
                    ${queries.map(query => `<li>${query}</li>`).join('')}
                </ul>
            `;
            queriesContainer.style.display = 'block';
        }
    }
    
    getStepTitle(step) {
        const titles = {
            'initializing': 'Initializing Research',
            'planning': 'Creating Research Plan',
            'planning_complete': 'Planning Complete',
            'query_generation': 'Generating Queries',
            'researching': 'Conducting Research',
            'writing': 'Writing Sections',
            'finalizing': 'Finalizing Report',
            'complete': 'Research Complete'
        };
        return titles[step] || 'Processing...';
    }
    
    updateStepStatus(currentStep) {
        // Reset all steps
        document.querySelectorAll('.step').forEach(step => {
            step.classList.remove('active', 'completed');
            step.querySelector('.step-status').textContent = '⏳';
        });
        
        const stepOrder = ['planning', 'query_generation', 'researching', 'writing', 'finalizing'];
        const currentIndex = stepOrder.findIndex(step => currentStep.includes(step));
        
        stepOrder.forEach((step, index) => {
            const stepElement = document.getElementById(`step-${step}`);
            if (index < currentIndex) {
                stepElement.classList.add('completed');
                stepElement.querySelector('.step-status').textContent = '✅';
            } else if (index === currentIndex) {
                stepElement.classList.add('active');
                stepElement.querySelector('.step-status').textContent = '🔄';
            }
        });
    }
    
    showResults(data) {
        this.isResearching = false;
        this.finalReport = data.result.final_report;
        
        // Update metadata
        document.getElementById('meta-topic').textContent = data.result.topic;
        document.getElementById('meta-sections').textContent = data.result.sections.length;
        document.getElementById('meta-timestamp').textContent = new Date(data.result.timestamp).toLocaleString();
        
        // Render markdown
        this.renderMarkdown(data.result.final_report);
        
        // Show results
        this.hideSection('progress-section');
        this.showSection('results-section');
        
        // Complete all steps
        document.querySelectorAll('.step').forEach(step => {
            step.classList.remove('active');
            step.classList.add('completed');
            step.querySelector('.step-status').textContent = '✅';
        });
        
        this.showToast('Research completed successfully!', 'success');
    }
    
    renderMarkdown(markdown) {
        const renderedReport = document.getElementById('rendered-report');
        const rawMarkdown = document.getElementById('raw-markdown');
        
        // Render markdown to HTML
        renderedReport.innerHTML = marked.parse(markdown);
        
        // Set raw markdown
        rawMarkdown.textContent = markdown;
        
        // Highlight code if Prism is available
        if (typeof Prism !== 'undefined') {
            Prism.highlightElement(rawMarkdown);
        }
    }
    
    showError(message) {
        this.isResearching = false;
        
        document.getElementById('error-message').textContent = message;
        this.hideSection('progress-section');
        this.showSection('error-section');
        
        this.showToast(message, 'error');
    }
    
    resetProgress() {
        document.getElementById('progress-fill').style.width = '0%';
        document.getElementById('progress-percent').textContent = '0%';
        document.getElementById('current-step').textContent = 'Initializing...';
        document.getElementById('status-message').textContent = 'Starting research process...';
        
        // Reset all steps
        document.querySelectorAll('.step').forEach(step => {
            step.classList.remove('active', 'completed');
            step.querySelector('.step-status').textContent = '⏳';
        });
    }
    
    copyReport() {
        if (!this.finalReport) {
            this.showToast('No report to copy', 'error');
            return;
        }
        
        navigator.clipboard.writeText(this.finalReport).then(() => {
            this.showToast('Report copied to clipboard!', 'success');
        }).catch(() => {
            this.showToast('Failed to copy report', 'error');
        });
    }
    
    downloadReport() {
        if (!this.finalReport) {
            this.showToast('No report to download', 'error');
            return;
        }
        
        const blob = new Blob([this.finalReport], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = `research_report_${this.currentTopic.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('Report downloaded!', 'success');
    }
    
    resetApp() {
        this.isResearching = false;
        this.currentTopic = '';
        this.finalReport = '';
        
        // Clear input
        document.getElementById('topic-input').value = '';
        
        // Show input section
        this.showSection('input-section');
        this.hideSection('progress-section');
        this.hideSection('results-section');
        this.hideSection('error-section');
        
        // Generate new session ID
        this.sessionId = this.generateSessionId();
        this.setupWebSocket();
    }
    
    retryResearch() {
        this.hideSection('error-section');
        this.startResearch();
    }
    
    toggleRawMarkdown() {
        const renderedReport = document.getElementById('rendered-report');
        const rawReport = document.getElementById('raw-report');
        const toggleBtn = document.getElementById('toggle-raw-btn');
        
        if (rawReport.style.display === 'none') {
            renderedReport.style.display = 'none';
            rawReport.style.display = 'block';
            toggleBtn.textContent = 'View Rendered';
        } else {
            renderedReport.style.display = 'block';
            rawReport.style.display = 'none';
            toggleBtn.textContent = 'View Raw Markdown';
        }
    }
    
    showSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'block';
            section.classList.add('fade-in');
        }
    }
    
    hideSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'none';
            section.classList.remove('fade-in');
        }
    }
    
    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        // Style the toast
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            borderRadius: '0.5rem',
            color: 'white',
            fontWeight: '500',
            zIndex: '1000',
            maxWidth: '400px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
            animation: 'slideInRight 0.3s ease'
        });
        
        // Set background color based on type
        const colors = {
            success: '#22c55e',
            error: '#ef4444',
            info: '#3b82f6',
            warning: '#f59e0b'
        };
        toast.style.background = colors[type] || colors.info;
        
        // Add to DOM
        document.body.appendChild(toast);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ResearchApp();
});

// Add toast animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style); 