# Drivechain Launcher Architecture Guide

## Overview
The Drivechain Launcher is an Electron-based application that manages blockchain nodes and wallets. It provides a user interface for downloading, starting, stopping, and managing various blockchain implementations including Bitcoin (patched), Thunder, and other related tools.

## Core Components

### 1. Electron Backend (public/electron.js)
The main Electron process handles:
- Application lifecycle management
- IPC (Inter-Process Communication) between frontend and backend
- Chain process management (starting/stopping nodes)
- File system operations
- Download management

Key classes:
- `DownloadManager`: Handles downloading and extracting chain binaries
- Chain process management through `spawn` and process monitoring

### 2. React Frontend (src/)
The frontend is built with React and provides:
- Navigation through different sections (Nodes, Wallet, Settings, etc.)
- User interface for managing chains
- Theme management (light/dark mode)
- Status monitoring of chains and downloads

Key components:
- `App.js`: Main application component and routing
- `NavBar.js`: Navigation interface
- Various modal components for settings and downloads

#### State Management (Redux)
The application uses Redux for state management with the following slices:
- `chainsSlice`: Manages chain statuses and configurations
- `downloadSlice`: Handles download states and progress
- `downloadModalSlice`: Controls download modal UI state
- `faucetSlice`: Manages faucet-related functionality

Each slice maintains its portion of the application state and provides actions for state updates. For example, the chains slice handles:
- Setting available chains
- Updating chain status (running/stopped/downloading)
- Tracking download progress

### 3. Module System (public/modules/)

#### chainManager.js
Manages blockchain node processes:
- Starting/stopping chains
- Monitoring chain status
- Managing chain directories
- Process output handling

#### downloadManager.js (integrated in electron.js)
Handles binary downloads:
- Download progress tracking
- File extraction (ZIP/TAR)
- Resume/pause functionality
- Platform-specific path handling

### 4. Configuration (chain_config.json)
Defines chain-specific configurations:
- Binary locations and download URLs
- Platform-specific paths
- Network configurations
- Chain metadata

## Communication Flow

1. **Frontend → Backend**
   - Uses IPC channels defined in electron.js
   - Sends commands for chain operations
   - Requests status updates and configurations

2. **Backend → Frontend**
   - Emits events for chain status changes
   - Sends download progress updates
   - Provides process output and error information

## Directory Structure

- `/public`: Electron main process and preload scripts
  - `/modules`: Core backend functionality
  - `chain_config.json`: Chain configurations
  - `electron.js`: Main process
  - `preload.js`: IPC bridge

- `/src`: React frontend
  - `/components`: UI components
  - `/contexts`: React contexts (e.g., ThemeContext)
  - `/store`: Redux store and slices
  - `/utils`: Utility functions

## Key Features

### Chain Management
- Download chain binaries from configured sources
- Extract and set up chain directories
- Start/stop chain processes
- Monitor chain status and output
- Reset chain data

### Download Management
- Progress tracking
- Pause/resume functionality
- Platform-specific binary handling
- Extraction of ZIP/TAR archives

### Configuration System
- Platform-specific paths
- Chain-specific settings
- Network configurations
- Binary locations and URLs

## Platform Compatibility
The application handles platform-specific requirements:
- Different binary paths per OS
- Platform-specific directory structures
- Executable permissions handling
- Archive format handling (ZIP/TAR)

## Security Considerations
- Process isolation through Electron's architecture
- Controlled file system access
- Secure IPC communication
- Binary verification (hashes provided in config)

## Error Handling
- Download failure recovery
- Process monitoring and cleanup
- Directory management error handling
- Cross-platform compatibility checks

This architecture provides a robust foundation for managing multiple blockchain nodes while maintaining a user-friendly interface and ensuring proper resource management across different platforms.
