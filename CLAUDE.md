# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a VS Code extension called "Image Utils" that provides image comparison and preview functionality. The extension allows users to compare images from two directories side-by-side and preview images from a single directory with advanced viewing capabilities.

## Build & Development Commands

- **Compile TypeScript**: `npm run compile` - Compiles TypeScript to JavaScript in the `out/` directory  
- **Watch mode**: `npm run watch` - Continuously compiles TypeScript on file changes
- **Prepare for publish**: `npm run vscode:prepublish` - Runs compile before publishing

## Architecture

### Core Extension Structure
- **Main entry**: `src/extension.ts` - Contains all extension logic in a single file
- **Commands**: Three main commands registered:
  - `imageUtils.openComparison` - Compare images from two selected directories
  - `imageUtils.openPreview` - Preview images from a single directory  
  - `imageUtils.openRename` - Batch rename images in a directory
- **Webview-based UI**: Uses VS Code webviews with embedded HTML/CSS/JavaScript for the user interface

### Key Functionality
- **Image Comparison**: Side-by-side comparison with slideshow controls, speed adjustment, and keyboard navigation
- **Image Preview**: Grid/list view switching with full-screen viewing, zoom, and pan capabilities
- **Batch Rename**: Sequential renaming with configurable zero-padding, sort order, and starting number
- **Supported formats**: JPEG, PNG, GIF, BMP, WebP
- **Context menu integration**: Right-click commands in VS Code Explorer based on folder selection

### Webview Architecture
The extension generates complete HTML documents with embedded CSS and JavaScript that:
- Handle image loading via VS Code webview URIs
- Implement interactive controls (sliders, buttons, keyboard shortcuts)
- Manage view state (current image, zoom level, play/pause state)
- Communicate with the extension host via `acquireVsCodeApi()`

### File Structure
- Main logic resides in `extension.ts` with three primary webview functions:
  - `getWebviewContent()` - Generates HTML for image comparison
  - `getPreviewWebviewContent()` - Generates HTML for image preview
  - `getRenameWebviewContent()` - Generates HTML for batch rename interface
- Helper functions for file system operations (`getImageFiles`, `findMatchingImages`, `executeRename`)
- Sample images in `sample_images/` for testing

## Extension Packaging
- Built extensions are stored in `package/` directory as `.vsix` files
- Current version: 0.0.4 with batch rename functionality