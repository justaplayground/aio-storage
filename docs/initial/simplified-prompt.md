## Simplified AI Agent Prompt for Storage Management SRS v1.2

**Title:** Asynchronous Storage Management System

**Overview:**  
Design a scalable, fault-tolerant storage service (like Google Drive) that supports asynchronous upload, download, streaming, and core file/folder operations. Use microservices, cloud-native components, message queues, and CDNs. Store file blobs in object storage and metadata in a relational database. Containerize all components using Docker Compose for easy deployment.

***

### 1. Tech Stack  
- Frontend (Storage Management dashboard): Next.js  
- Backend (API): Express.js  
- Documentation site: Docusaurus  
- Database: PostgreSQL (self-hosted Docker volume)  
- File storage: Self-hosted Docker volume  
- Orchestration: Docker Compose (single master repository for all containers)  

***

### 2. Core Architecture  
- **API Layer:** REST endpoints in Express.js with JWT  
- **Worker Layer:** Background jobs via Kafka/RabbitMQ and worker pools  
- **Storage:** Self-hosted volume for files, PostgreSQL for metadata  
- **CDN/Streaming:** CDN for downloads; HLS/DASH for video preview  
- **Cache & Logging:** Redis for temporary state; centralized JSON logs  

***

### 3. Asynchronous Upload  
1. Client → Next.js dashboard requests upload → Express.js API validates → issues signed URL or chunk instructions  
2. Enqueue “upload” job with metadata  
3. Worker nodes pull from queue, process file, store in Docker volume, update PostgreSQL  
4. Notify client via WebSocket or polling  

*Resilience:* Auto-scale workers, retry with backoff, dead-letter queues  

***

### 4. Asynchronous Download  
1. Client → API checks permissions → issues signed URL  
2. Enqueue “download” job for large/transformed files  
3. Worker fetches/transforms file from Docker volume, serves via CDN  

*Resilience:* CDN caching, rate limiting, retry on failures  

***

### 5. Video Streaming Preview  
1. Dashboard requests preview → enqueue transcoding to HLS/DASH  
2. Worker generates segments, stores in Docker volume  
3. API returns manifest URL; client streams adaptively via CDN  

***

### 6. Database Schema (Metadata)  
- **Users:** user_id, email, password_hash, timestamps  
- **Folders:** folder_id, user_id, parent_id, path, timestamps  
- **Files:** file_id, user_id, folder_id, name, size, mime_type, storage_key, version, timestamps  
- **Shares:** share_id, resource_id/type, shared_with, permission, expiry  
- **Audit Logs:** log_id, user_id, action, resource_id, details, timestamp  

***

### 7. Functional Modules & Priority  
**High Priority (MVP):**  
- User sign-up/login, JWT auth  
- Folder creation/navigation  
- File upload/download  
- Sharing & access control  
- Centralized error handling/logging  

**Medium Priority:**  
- Profile management, password reset  
- Search, preview, streaming  
- Quotas, notifications  

**Low Priority (Post-MVP):**  
- Version history, audit reporting  

***

### 8. Success Criteria  
- 99.9% upload/download uptime  
- <2 s API response for signed URL generation  
- Support 10,000 concurrent uploads/downloads with auto-scaling  

***

### 9. Constraints & Assumptions  
- All services containerized via Docker Compose  
- Self-hosted PostgreSQL and file storage in Docker volumes  
- Single Docker network across all containers  

***

### Open Questions  
- Which message queue technology (Kafka vs. RabbitMQ) is preferred?  
- What CDN provider or self-hosted solution will be used?  
- Any specific SLAs for storage volume performance?  

### Risks & Mitigations  
- **Volume I/O bottlenecks:** Use SSD-backed volumes; monitor I/O metrics  
- **Container orchestration complexity:** Maintain clear Docker Compose configurations; run integration tests  
- **Data consistency on failure:** Implement transactional updates in metadata; use idempotent workers  

---