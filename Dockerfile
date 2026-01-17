# Stage 1: Build the React application
FROM node:20-slim AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Build the React app (output goes to /app/dist)
RUN npm run build

# Stage 2: Set up the Streamlit Python environment
FROM python:3.9-slim
WORKDIR /app

# Install necessary system tools
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Python dependencies and install
COPY requirements.txt .
RUN pip3 install -r requirements.txt

# Copy the built frontend assets from the previous stage
COPY --from=frontend-builder /app/dist ./dist

# Copy the Streamlit app script
COPY streamlit_app.py .

# Expose the default Streamlit port
EXPOSE 8501

# Healthcheck to ensure the app is running
HEALTHCHECK CMD curl --fail http://localhost:8501/_stcore/health || exit 1

# Run the application
ENTRYPOINT ["streamlit", "run", "streamlit_app.py", "--server.port=8501", "--server.address=0.0.0.0"]
