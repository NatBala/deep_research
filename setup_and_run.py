#!/usr/bin/env python3
"""
Setup and Run Script for Deep Research Web Application

This script helps set up the environment and run the application.
It checks for API keys and provides guidance if they're missing.
"""

import os
import sys
import subprocess
import platform
from pathlib import Path


def print_banner():
    """Print a welcome banner."""
    print("="*70)
    print("🔍 DEEP RESEARCH ASSISTANT - SETUP & RUN")
    print("="*70)
    print("A professional web interface for AI-powered research")
    print("Similar to OpenAI's deep research UI with real-time progress")
    print("="*70)


def check_python_version():
    """Check if we're using a compatible Python version."""
    version = sys.version_info
    print(f"📋 Python Version: {version.major}.{version.minor}.{version.micro}")
    
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("❌ Python 3.8+ is required")
        return False
    
    print("✅ Python version is compatible")
    return True


def check_dependencies():
    """Check if required packages are installed."""
    required_packages = [
        'langchain', 'langchain_openai', 'langchain_community',
        'tavily', 'fastapi', 'uvicorn', 'jinja2', 'websockets'
    ]
    
    missing_packages = []
    
    print("\n📦 Checking dependencies...")
    for package in required_packages:
        try:
            if package == 'tavily':
                __import__('tavily')
            else:
                __import__(package.replace('-', '_'))
            print(f"  ✅ {package}")
        except ImportError:
            missing_packages.append(package)
            print(f"  ❌ {package}")
    
    if missing_packages:
        print(f"\n❌ Missing packages: {', '.join(missing_packages)}")
        print("\nTo install missing packages, run:")
        print("pip install langchain langchain-openai langchain-community tavily-python")
        print("pip install fastapi uvicorn jinja2 websockets python-multipart")
        return False
    
    print("✅ All dependencies are installed")
    return True


def check_api_keys():
    """Check if API keys are set and help user set them."""
    required_keys = {
        'OPENAI_API_KEY': 'OpenAI API key for GPT-4o model',
        'TAVILY_API_KEY': 'Tavily API key for web search'
    }
    
    missing_keys = []
    
    print("\n🔑 Checking API keys...")
    for key, description in required_keys.items():
        if os.getenv(key):
            print(f"  ✅ {key} is set")
        else:
            missing_keys.append((key, description))
            print(f"  ❌ {key} is missing")
    
    if missing_keys:
        print(f"\n❌ Missing API keys:")
        for key, description in missing_keys:
            print(f"  • {key}: {description}")
        
        print(f"\n🔧 How to set API keys:")
        if platform.system() == "Windows":
            print("For Windows PowerShell:")
            for key, _ in missing_keys:
                print(f"  $env:{key}=\"your_api_key_here\"")
            print("\nFor Windows Command Prompt:")
            for key, _ in missing_keys:
                print(f"  set {key}=your_api_key_here")
        else:
            print("For Linux/Mac:")
            for key, _ in missing_keys:
                print(f"  export {key}=your_api_key_here")
        
        print(f"\n📝 Get your API keys:")
        print("  • OpenAI: https://platform.openai.com/api-keys")
        print("  • Tavily: https://app.tavily.com/")
        
        return False
    
    print("✅ All API keys are configured")
    return True


def run_demo():
    """Run the demo script."""
    print(f"\n🚀 Running Demo...")
    print("This demonstrates the same functionality as the web interface")
    print("="*50)
    
    try:
        result = subprocess.run([
            sys.executable, 'demo_web_app.py', 
            'Artificial Intelligence in Healthcare'
        ], check=True)
        return True
    except subprocess.CalledProcessError:
        print("❌ Demo failed to run")
        return False
    except KeyboardInterrupt:
        print("\n⏸️  Demo interrupted by user")
        return True


def run_web_app():
    """Run the web application."""
    print(f"\n🌐 Starting Web Application...")
    print("Open your browser and go to: http://localhost:8000")
    print("Press Ctrl+C to stop the server")
    print("="*50)
    
    try:
        subprocess.run([
            sys.executable, '-m', 'uvicorn', 
            'app:app', 
            '--host', '0.0.0.0', 
            '--port', '8000', 
            '--reload'
        ], check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ Web app failed to start: {e}")
        return False
    except KeyboardInterrupt:
        print("\n👋 Web server stopped by user")
        return True


def main():
    """Main setup and run function."""
    print_banner()
    
    # Check system requirements
    if not check_python_version():
        sys.exit(1)
    
    if not check_dependencies():
        print(f"\n❌ Please install missing dependencies first")
        sys.exit(1)
    
    if not check_api_keys():
        print(f"\n❌ Please set your API keys first")
        print(f"After setting your API keys, run this script again")
        sys.exit(1)
    
    print(f"\n✅ All requirements met!")
    
    # Ask user what they want to run
    print(f"\n🎯 What would you like to run?")
    print("1. Demo (Terminal version with progress updates)")
    print("2. Web Application (Full web interface)")
    print("3. Both (Demo first, then web app)")
    
    while True:
        choice = input("\nEnter your choice (1/2/3): ").strip()
        
        if choice == '1':
            run_demo()
            break
        elif choice == '2':
            run_web_app()
            break
        elif choice == '3':
            if run_demo():
                input("\n✨ Demo complete! Press Enter to start the web application...")
                run_web_app()
            break
        else:
            print("❌ Invalid choice. Please enter 1, 2, or 3.")


if __name__ == "__main__":
    main() 