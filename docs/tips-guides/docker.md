# Using Docker

Docker provides a streamlined and efficient method for managing containerized applications, making it an ideal choice for deploying this project.

## Requirements

- **Architecture:** An x86-64 or ARM(64) based computer.
- **Operating System:** Linux, macOS (with Docker Desktop or equivalent), or Windows (with WSL).
- **Software:** Docker and Docker Compose installed and configured.

## Steps

1.  **Clone the Repository:**
    Navigate to the desired directory in your terminal and clone the project repository. If you're not already in the project directory after cloning, change into it:

    ```sh
    git clone https://github.com/cgoinglove/better-chatbot
    cd better-chatbot
    ```

2.  **Set up Environment Variables:**
    Run `pnpm initial:env` to generate the `.env` file.  
    Then, enter the API keys only for the LLM providers you plan to use.

    You can generate an authentication secret (`BETTER_AUTH_SECRET`) with the command:  
    `pnpx auth secret`

    For the database, Docker will handle all necessary configuration automatically,  
    so the default `docker/.env` file is sufficient.



1.  **Build and Start the Container:**
    From the project's root directory, build the Docker image and start the container in detached mode (running in the background):

    ```sh
    pnpm docker-compose:up
    ```

    Your application should now be running. You can access it by visiting `http://<ipofserver>:3000/` in your web browser. Replace `<ipofserver>` with the IP address of the server where Docker is running (this will likely be `localhost` if you're running it on your local machine).

## Using your own database

If you don't want to host your own db, here are some steps

1. Open up your docker compose file. `docker/compose.yml`
   Comment out the postgres section and the volume
2. Update `.env` change your DB url
3. Migrate the DB

```sh
pnpm db:migrate
```

4. Run the app

```sh
pnpm docker-compose:up
```

## Using MinIO for File Storage

The Docker setup includes MinIO, an S3-compatible object storage service that's perfect for file uploads in your chatbot application.

### MinIO Configuration

MinIO is already configured in the Docker Compose setup with the following defaults:

```yaml
# docker/compose.yml
minio:
  image: minio/minio:latest
  ports:
    - "${MINIO_PORT:-9000}:9000"      # API port
    - "${MINIO_CONSOLE_PORT:-9001}:9001"  # Console port
  environment:
    MINIO_ROOT_USER: ${MINIO_USER:-minioadmin}
    MINIO_ROOT_PASSWORD: ${MINIO_PASSWORD:-minioadmin}
```

### Environment Variables

Add these to your `.env` file to configure MinIO:

```ini
# MinIO Configuration
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001
MINIO_USER=minioadmin
MINIO_PASSWORD=minioadmin

# File Storage Configuration for MinIO
FILE_STORAGE_TYPE=minio
FILE_STORAGE_PREFIX=uploads
MINIO_ENDPOINT=http://localhost:9000
MINIO_REGION=us-east-1
MINIO_USE_SSL=false
MINIO_BUCKET=uploads
```

### Accessing MinIO

Once your Docker containers are running:

1. **MinIO Console**: Visit `http://localhost:9001` in your browser
2. **Login**: Use the credentials from your `.env` file (default: minioadmin/minioadmin)
3. **API Endpoint**: Available at `http://localhost:9000`

### Using MinIO with the Application

To enable MinIO for file storage:

1. Set `FILE_STORAGE_TYPE=minio` in your `.env` file
2. Restart the Docker containers: `pnpm docker-compose:down && pnpm docker-compose:up`
3. The application will automatically use MinIO for file uploads

## What is possible in docker and what is not

- Full support for MCP stdio servers that work with bunx, uvx and npx.
- Full support for SSE,Streamable Remote servers.
- Full support for MinIO file storage with automatic container setup.
- And everything else as you would expect.

## Managing the Container

### Stopping the Container

To stop the running container, ensure you are in the project's root directory and execute:

```sh
pnpm docker-compose:down
```

### Updating the Application

To update the application to the latest version:

```sh
pnpm docker-compose:update
```
