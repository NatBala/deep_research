#!/usr/bin/env python3
"""
Demo script for the Deep Research Web Application

This script demonstrates the research functionality that powers the web interface.
It simulates the same workflow that the web app uses but runs in the terminal.
"""

import asyncio
import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Add the src directory to Python path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from open_deep_research.simple_graph import simple_graph


class ResearchDemo:
    """Demonstrates the research functionality used by the web app."""
    
    def __init__(self):
        self.session_id = f"demo_{int(datetime.now().timestamp())}"
    
    def print_status(self, step: str, message: str, progress: int):
        """Print a status update similar to the web interface."""
        print(f"\n{'='*60}")
        print(f"🔍 STEP: {step.upper()}")
        print(f"📊 PROGRESS: {progress}%")
        print(f"💬 STATUS: {message}")
        print(f"{'='*60}")
    
    def print_section_info(self, sections):
        """Print information about the research sections."""
        print(f"\n📋 RESEARCH OUTLINE:")
        print(f"{'─'*50}")
        for i, section in enumerate(sections, 1):
            print(f"{i}. {section['section_name']}")
            print(f"   Queries: {len(section['queries'])}")
            print(f"   Summary: {section['summary'][:100]}...")
            print()
    
    async def run_research(self, topic: str):
        """Run the research workflow with progress updates."""
        
        print(f"\n🚀 STARTING DEEP RESEARCH")
        print(f"📝 Topic: {topic}")
        print(f"🆔 Session: {self.session_id}")
        
        # Configuration
        config = {
            "configurable": {
                "thread_id": self.session_id,
                "model_provider": "openai",
                "model_name": "gpt-4o",
                "search_api": "tavily",
                "number_of_queries_per_section": 3,
                "max_results_per_query": 5
            }
        }
        
        try:
            # Step 1: Initialize
            self.print_status("initializing", f"Starting research on: {topic}", 0)
            await asyncio.sleep(1)  # Simulate processing time
            
            # Step 2: Planning
            self.print_status("planning", "Analyzing topic and creating research outline...", 10)
            await asyncio.sleep(1)
            
            # Step 3: Query Generation
            self.print_status("query_generation", "Generating targeted search queries for each section...", 25)
            await asyncio.sleep(1)
            
            # Step 4: Research
            self.print_status("researching", "Conducting web searches and gathering information...", 40)
            await asyncio.sleep(2)
            
            # Step 5: Writing
            self.print_status("writing", "Analyzing search results and writing detailed sections...", 70)
            
            # Run the actual research
            result = await simple_graph.ainvoke({"topic": topic}, config=config)
            
            # Step 6: Complete
            self.print_status("complete", "Research completed successfully!", 100)
            
            # Display results
            self.display_results(topic, result)
            
            return result
            
        except Exception as e:
            print(f"\n❌ ERROR: {str(e)}")
            print("Please check your API keys and internet connection.")
            return None
    
    def display_results(self, topic: str, result: dict):
        """Display the research results."""
        
        print(f"\n🎉 RESEARCH COMPLETE!")
        print(f"{'='*80}")
        
        # Research metadata
        print(f"📊 RESEARCH SUMMARY:")
        print(f"   Topic: {topic}")
        print(f"   Sections: {len(result['section_results'])}")
        print(f"   Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Section information
        self.print_section_info(result['section_results'])
        
        # Final report
        print(f"📄 FINAL REPORT:")
        print(f"{'─'*80}")
        print(result['final_report'])
        print(f"{'─'*80}")
        
        # Export options
        print(f"\n💾 EXPORT OPTIONS:")
        print(f"1. Copy the report above")
        print(f"2. Save to file: research_report_{topic.replace(' ', '_').lower()}_{datetime.now().strftime('%Y%m%d')}.md")
        
        # Save to file
        filename = f"research_report_{topic.replace(' ', '_').lower()}_{datetime.now().strftime('%Y%m%d')}.md"
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(f"# Research Report: {topic}\n\n")
                f.write(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
                f.write("## Summary\n\n")
                for section in result['section_results']:
                    f.write(f"### {section['section_name']}\n")
                    f.write(f"**Queries:** {', '.join(section['queries'])}\n\n")
                    f.write(f"{section['summary']}\n\n")
                f.write("## Full Report\n\n")
                f.write(result['final_report'])
            
            print(f"✅ Report saved to: {filename}")
        except Exception as e:
            print(f"⚠️  Could not save file: {e}")


def check_requirements():
    """Check if API keys are set."""
    required_keys = ['OPENAI_API_KEY', 'TAVILY_API_KEY']
    missing_keys = []
    
    for key in required_keys:
        if not os.getenv(key):
            missing_keys.append(key)
    
    if missing_keys:
        print(f"❌ Missing required environment variables: {', '.join(missing_keys)}")
        print("\nPlease set these environment variables:")
        for key in missing_keys:
            print(f"  export {key}=your_api_key_here  # Linux/Mac")
            print(f"  set {key}=your_api_key_here     # Windows")
        return False
    
    return True


async def main():
    """Main function to run the demo."""
    
    print("🔍 Deep Research Assistant - Demo")
    print("This demonstrates the same functionality as the web interface")
    print("="*70)
    
    # Check requirements
    if not check_requirements():
        sys.exit(1)
    
    # Get topic from user or use default
    if len(sys.argv) > 1:
        topic = " ".join(sys.argv[1:])
    else:
        topic = input("\n📝 Enter research topic (or press Enter for default): ").strip()
        if not topic:
            topic = "Artificial Intelligence in Healthcare"
    
    print(f"\n🎯 Researching: {topic}")
    
    # Run the research
    demo = ResearchDemo()
    result = await demo.run_research(topic)
    
    if result:
        print(f"\n✨ Demo completed successfully!")
        print(f"This is the same research process used by the web interface.")
    else:
        print(f"\n❌ Demo failed. Please check your configuration.")


if __name__ == "__main__":
    # Run the demo
    asyncio.run(main()) 