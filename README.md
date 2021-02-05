## Scraper
My attempt to build a framework for rapid and effortless development (but also maintenance) of web scrapers using knowledge I gained in the last 2 years.

### Components
The framework currently includes:
- HTTP Client
    - Easy and enjoyable request building using fluent interface - build, perform and parse in a single line!
    - Elastic configuration - manage client parameters easily
    - Built-in interceptors for productivity:
        - Add authorization headers
        - Retry failed requests automatically
        - Random fail rate - make sure you can handle connection problems
- Web Robot base class
    - Built-in support for concurrency
    - Introduction of scopes - keep track of your scraper's execution:
        - Know how much time each data scope takes to scrap
        - Be notified which items create most errors
        - Logs will be enhanced with current execution scope
    - Data streaming

### Plans
Features I am planning to add:
- Web UI interface - view execution logs in a tree-like structure using scopes described above
- Multi-threading using Web Worker API
- Distribution of scrapers among multiple computers
- Saving and restoring scraping progress
- Data processing pipeline, including helpers:
    - Archive data extraction
- Easy-to-add data persistence
- Scraping progress tracking
- Captcha solver (using external APIs and ML)
- HTTP Client interceptors:
    - Cookie persistence (in-memory and filesystem)
    - Response persistence (cache small requests)
    - Rate limiter
    - Automatic proxy switcher
- HTML parsing helpers:
    - Auto login form recognition
    - Table parser
    - Pagination recognizer
    - Element anchoring (be resistant to CSS/HTML changes)
