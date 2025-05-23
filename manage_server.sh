#!/bin/bash

# Script to manage NGINX and the Node.js application (cmc-globe)
# This script is intended to be run on the Linux server where the application is deployed.

# Variables
APP_DIR_NAME="cmc-globe"
# Assuming this script is in the project root, and cmc-globe is a subdirectory
APP_PATH="$(pwd)/${APP_DIR_NAME}"
NGINX_CONFIG_PATH="${APP_PATH}/nginx.conf" # NGINX config is inside cmc-globe
NGINX_ACCESS_LOG="/var/log/nginx/websocket_access.log"
NGINX_ERROR_LOG="/var/log/nginx/websocket_error.log"
NODE_APP_LOG_FILE="app.log" # Log file for the Node app stdout/stderr

# Ensure script is run with sudo for NGINX commands if not already root
check_sudo() {
    if [ "$EUID" -ne 0 ] && ! groups | grep -q '\bsudo\b' && ! sudo -n true 2>/dev/null; then
        echo "Please run this script with sudo or as root for NGINX operations."
        # exit 1 # Optionally exit, or let individual commands fail
    fi
}

# Function to start NGINX
start_nginx() {
    check_sudo
    echo "Attempting to start NGINX..."
    if ! sudo nginx -t -c "${NGINX_CONFIG_PATH}"; then
        echo "NGINX configuration test failed. Please check '${NGINX_CONFIG_PATH}'."
        return 1
    fi
    sudo systemctl start nginx
    sudo systemctl status nginx --no-pager
}

# Function to stop NGINX
stop_nginx() {
    check_sudo
    echo "Stopping NGINX..."
    sudo systemctl stop nginx
    sudo systemctl status nginx --no-pager
}

# Function to reload NGINX configuration
reload_nginx() {
    check_sudo
    echo "Reloading NGINX configuration..."
    if ! sudo nginx -t -c "${NGINX_CONFIG_PATH}"; then
        echo "NGINX configuration test failed. Please check '${NGINX_CONFIG_PATH}'."
        return 1
    fi
    sudo systemctl reload nginx
    echo "NGINX reloaded."
}

# Function to check NGINX status
status_nginx() {
    check_sudo
    echo "NGINX status:"
    sudo systemctl status nginx --no-pager
}

# Function to start the Node.js application (development mode)
start_app_dev() {
    echo "Starting Node.js application in development mode (cmc-globe)..."
    echo "Application output will be logged to ${NODE_APP_LOG_FILE}."
    echo "To stop this tail view, press Ctrl+C (the app will continue running in the background)."
    cd "${APP_PATH}" || { echo "Failed to cd into ${APP_PATH}"; exit 1; }
    
    # Redirect nohup's stdout and stderr directly to the log file
    nohup npm run dev > "../${NODE_APP_LOG_FILE}" 2>&1 &
    
    echo $! > "../app.pid"
    cd ..
    echo "App started in dev mode. PID: $(cat app.pid). Tailing log (Ctrl+C to stop tailing this view):"
    # Ensure the log file exists before tailing, and give nohup a moment to create it
    sleep 0.5 
    if [ -f "${NODE_APP_LOG_FILE}" ]; then
        tail -f "${NODE_APP_LOG_FILE}"
    else
        echo "Log file ${NODE_APP_LOG_FILE} not yet created. Check manually."
    fi
}

# Function to start the Node.js application (production mode)
start_app_prod() {
    echo "Starting Node.js application in production mode (cmc-globe)..."
    echo "Ensure you have run 'npm run build' first."
    echo "Application output will be logged to ${NODE_APP_LOG_FILE}."
    cd "${APP_PATH}" || { echo "Failed to cd into ${APP_PATH}"; exit 1; }
    nohup npm start > "../${NODE_APP_LOG_FILE}" 2>&1 &
    echo $! > "../app.pid"
    cd ..
    echo "App started in production mode. PID: $(cat app.pid). Check ${NODE_APP_LOG_FILE} for logs."
}

# Function to stop the Node.js application
stop_app() {
    echo "Stopping Node.js application..."
    if [ -f "app.pid" ]; then
        PID=$(cat "app.pid")
        if ps -p "${PID}" > /dev/null; then
            kill "${PID}"
            # Wait a bit for the process to terminate
            sleep 2
            if ps -p "${PID}" > /dev/null; then
                echo "Process ${PID} did not terminate gracefully, sending SIGKILL."
                kill -9 "${PID}"
            else
                echo "Process ${PID} stopped."
            fi
            rm "app.pid"
        else
            echo "Process with PID ${PID} not found. Maybe it was already stopped?"
            rm "app.pid"
        fi
    else
        echo "app.pid file not found. Cannot determine process to stop."
        echo "You might need to find and kill the 'node server.mjs' process manually."
        echo "Example: pgrep -f 'node server.mjs' | xargs kill"
    fi
}


# Function to view NGINX access log for WebSockets
view_nginx_access_log() {
    echo "Tailing NGINX WebSocket access log (${NGINX_ACCESS_LOG})... (Ctrl+C to stop)"
    sudo tail -f "${NGINX_ACCESS_LOG}"
}

# Function to view NGINX error log for WebSockets
view_nginx_error_log() {
    echo "Tailing NGINX WebSocket error log (${NGINX_ERROR_LOG})... (Ctrl+C to stop)"
    sudo tail -f "${NGINX_ERROR_LOG}"
}

# Function to view application log
view_app_log() {
    echo "Tailing application log (${NODE_APP_LOG_FILE})... (Ctrl+C to stop)"
    if [ ! -f "${NODE_APP_LOG_FILE}" ]; then
        echo "Log file ${NODE_APP_LOG_FILE} not found. Has the app been started with this script?"
        return 1
    fi
    tail -f "${NODE_APP_LOG_FILE}"
}


# Main menu
echo "Server Management Script"
echo "------------------------"
echo "NGINX (WebSocket Proxy on 4444):"
echo "  1. Start NGINX"
echo "  2. Stop NGINX"
echo "  3. Reload NGINX Config"
echo "  4. NGINX Status"
echo "Application (cmc-globe - Next.js & WebSocket Server):"
echo "  5. Start App (Development Mode)"
echo "  6. Start App (Production Mode - run 'npm run build' in ${APP_DIR_NAME} first)"
echo "  7. Stop App"
echo "Logs:"
echo "  8. View NGINX WebSocket Access Log"
echo "  9. View NGINX WebSocket Error Log"
echo " 10. View Application Log (stdout/stderr of node server.mjs)"
echo "  0. Exit"
echo "------------------------"
read -rp "Enter your choice: " choice

case $choice in
    1) start_nginx ;;
    2) stop_nginx ;;
    3) reload_nginx ;;
    4) status_nginx ;;
    5) start_app_dev ;;
    6) start_app_prod ;;
    7) stop_app ;;
    8) view_nginx_access_log ;;
    9) view_nginx_error_log ;;
    10) view_app_log ;;
    0) echo "Exiting."; exit 0 ;;
    *) echo "Invalid choice. Exiting."; exit 1 ;;
esac

exit 0
