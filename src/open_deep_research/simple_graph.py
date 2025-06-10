from typing import List, Dict, Any, TypedDict, Annotated
from dataclasses import dataclass
from operator import add

from langchain.chat_models import init_chat_model
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from pydantic import BaseModel, Field

from langgraph.constants import Send
from langgraph.graph import START, END, StateGraph
from langgraph.types import Command

from open_deep_research.utils import select_and_execute_search


# Pydantic models for structured outputs
class InitialSections(BaseModel):
    """Three initial sections for the topic."""
    section_1: str = Field(description="First section title and brief description")
    section_2: str = Field(description="Second section title and brief description") 
    section_3: str = Field(description="Third section title and brief description")

class SubQueries(BaseModel):
    """Sub-queries for a section."""
    queries: List[str] = Field(description="List of search queries for this section")

class SectionSummary(BaseModel):
    """Detailed summary for a section."""
    title: str = Field(description="Section title")
    summary: str = Field(description="Detailed summary based on retrieved content")

class FinalReport(BaseModel):
    """Final compiled report."""
    title: str = Field(description="Report title")
    executive_summary: str = Field(description="Executive summary of the report")
    sections: List[Dict[str, str]] = Field(description="List of sections with title and content")
    conclusion: str = Field(description="Final conclusion")


# Individual section result for parallel processing
class SectionResult(TypedDict):
    """Result from processing a single section."""
    section_name: str
    queries: List[str]
    content: str
    summary: str


# State definitions with reducer for parallel processing
class SimpleReportState(TypedDict):
    """Main state for the simple report workflow."""
    topic: str
    initial_sections: Dict[str, str]  # section_name -> description
    section_results: Annotated[List[SectionResult], add]  # List of section results with reducer
    final_report: str

class SectionProcessingState(TypedDict):
    """State for individual section processing."""
    topic: str
    section_name: str
    section_description: str


@dataclass(kw_only=True)
class SimpleWorkflowConfiguration:
    """Configuration for the simple workflow."""
    model_provider: str = "openai"
    model_name: str = "gpt-4o"
    search_api: str = "tavily"
    number_of_queries_per_section: int = 3
    max_results_per_query: int = 5


# Node functions
async def generate_initial_summary(state: SimpleReportState, config: RunnableConfig) -> Dict[str, Any]:
    """Generate initial summary with 3 sections for the given topic."""
    
    topic = state["topic"]
    
    # Initialize model
    model = init_chat_model(
        model="gpt-4o",
        model_provider="openai"
    )
    
    system_prompt = """You are a research analyst. Given a topic, create an initial research outline with exactly 3 main sections.
    
For each section, provide:
- A clear, descriptive title
- A brief description of what should be covered in that section

The 3 sections should provide comprehensive coverage of the topic from different angles or aspects."""

    user_prompt = f"Create an initial research outline with 3 sections for the topic: {topic}"
    
    structured_model = model.with_structured_output(InitialSections)
    
    result = await structured_model.ainvoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt)
    ])
    
    # Convert to dictionary format
    initial_sections = {
        "Section 1": result.section_1,
        "Section 2": result.section_2, 
        "Section 3": result.section_3
    }
    
    return {"initial_sections": initial_sections}


def route_to_section_processing(state: SimpleReportState) -> List[Send]:
    """Route each section to parallel processing."""
    
    topic = state["topic"]
    initial_sections = state["initial_sections"]
    
    return [
        Send("process_section", {
            "topic": topic,
            "section_name": section_name,
            "section_description": description
        })
        for section_name, description in initial_sections.items()
    ]


async def process_section(state: SectionProcessingState, config: RunnableConfig) -> Dict[str, Any]:
    """Process a single section: generate queries, retrieve content, create summary."""
    
    topic = state["topic"]
    section_name = state["section_name"]
    section_description = state["section_description"]
    
    # Initialize model
    model = init_chat_model(
        model="gpt-4o",
        model_provider="openai"
    )
    
    # Step 1: Generate sub-queries for this section
    query_system_prompt = """You are a research assistant. Generate specific search queries to gather comprehensive information for a research section.

Generate 3 focused search queries that will help gather detailed information for the given section."""

    query_user_prompt = f"""Topic: {topic}
Section: {section_name}
Description: {section_description}

Generate 3 specific search queries for this section."""

    structured_query_model = model.with_structured_output(SubQueries)
    
    query_result = await structured_query_model.ainvoke([
        SystemMessage(content=query_system_prompt),
        HumanMessage(content=query_user_prompt)
    ])
    
    queries = query_result.queries
    
    # Step 2: Retrieve content using Tavily search
    search_params = {"max_results": 5}
    content = await select_and_execute_search("tavily", queries, search_params)
    
    # Step 3: Create detailed summary based on retrieved content
    summary_system_prompt = """You are a research analyst. Create a comprehensive, detailed summary for a research section based on the provided search results.

The summary should:
- Be well-structured and informative
- Include key facts, insights, and relevant details from the search results
- Be substantial enough to stand as a complete section in a research report
- Maintain objectivity and cite important findings"""

    summary_user_prompt = f"""Section: {section_name}
Description: {section_description}
Topic Context: {topic}

Search Results:
{content}

Create a detailed summary for this section based on the search results above."""

    summary_result = await model.ainvoke([
        SystemMessage(content=summary_system_prompt),
        HumanMessage(content=summary_user_prompt)
    ])
    
    # Return a single section result that will be added to the list
    section_result: SectionResult = {
        "section_name": section_name,
        "queries": queries,
        "content": content,
        "summary": summary_result.content
    }
    
    return {"section_results": [section_result]}


async def generate_final_report(state: SimpleReportState, config: RunnableConfig) -> Dict[str, Any]:
    """Generate the final comprehensive report."""
    
    topic = state["topic"]
    section_results = state["section_results"]
    
    # Initialize model
    model = init_chat_model(
        model="gpt-4o",
        model_provider="openai"
    )
    
    # Prepare section content for the final report
    sections_text = ""
    for section_result in section_results:
        section_name = section_result["section_name"]
        summary = section_result["summary"]
        sections_text += f"\n\n## {section_name}\n{summary}"
    
    system_prompt = """You are a professional report writer. Create a comprehensive final report that includes:

1. A compelling title for the report
2. An executive summary that captures the key insights
3. The detailed sections (already provided)
4. A conclusion that synthesizes the findings and provides final thoughts

The report should be well-structured, professional, and provide valuable insights on the topic."""

    user_prompt = f"""Topic: {topic}

Detailed Sections:{sections_text}

Create a final comprehensive report with:
- Title
- Executive Summary  
- The sections above (keep them as-is)
- Conclusion

Format this as a complete, professional report."""

    final_result = await model.ainvoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt)
    ])
    
    return {"final_report": final_result.content}


# Build the graph
def create_simple_research_graph():
    """Create the simple research workflow graph."""
    
    # Create the graph
    builder = StateGraph(SimpleReportState, config_schema=SimpleWorkflowConfiguration)
    
    # Add nodes
    builder.add_node("generate_initial_summary", generate_initial_summary)
    builder.add_node("process_section", process_section)
    builder.add_node("generate_final_report", generate_final_report)
    
    # Add edges
    builder.add_edge(START, "generate_initial_summary")
    builder.add_conditional_edges(
        "generate_initial_summary",
        route_to_section_processing,
        ["process_section"]
    )
    builder.add_edge("process_section", "generate_final_report")
    builder.add_edge("generate_final_report", END)
    
    return builder.compile()


# Create the graph instance
simple_graph = create_simple_research_graph() 