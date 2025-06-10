"""
Simple Research Workflow Example

This example demonstrates how to use the simplified research workflow
that creates a report with 3 sections using only Tavily search and OpenAI.
"""

import asyncio
import uuid
from open_deep_research.simple_graph import simple_graph


async def run_simple_research(topic: str):
    """Run the simple research workflow."""
    
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
    
    # Initial state
    initial_state = {"topic": topic}
    
    print(f"🔍 Starting research on: {topic}")
    print("=" * 60)
    
    # Run the workflow
    result = await simple_graph.ainvoke(initial_state, config=config)
    
    print("\n📊 Research Complete!")
    print("=" * 60)
    
    # Display results
    print("\n📋 Initial Sections Created:")
    for section_name, description in result["initial_sections"].items():
        print(f"  • {section_name}: {description}")
    
    print("\n🔍 Queries Generated:")
    for section_result in result["section_results"]:
        print(f"  {section_result['section_name']}:")
        for i, query in enumerate(section_result['queries'], 1):
            print(f"    {i}. {query}")
    
    print("\n📝 Section Summaries Created:")
    for section_result in result["section_results"]:
        print(f"  ✅ {section_result['section_name']}")
    
    print("\n📄 Final Report:")
    print("=" * 60)
    print(result["final_report"])
    
    return result


# Example usage
if __name__ == "__main__":
    # Example topics to try
    topics = [
        "Artificial Intelligence in Healthcare",
        "Climate Change Impact on Agriculture",
        "Blockchain Technology Applications",
        "Remote Work Trends 2024",
        "Electric Vehicle Market Analysis"
    ]
    
    # Run example
    selected_topic = topics[0]  # Change index to try different topics
    
    asyncio.run(run_simple_research(selected_topic)) 