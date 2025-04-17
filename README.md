# Ghibli AI Generator

A Next.js application that generates Studio Ghibli-style images using AI.

## Features

- Generate Ghibli-style images using Gemini AI
- User authentication with Supabase
- Credit system for image generation
- Chat history storage
- Dark/light mode support
- Responsive design

## Tech Stack

- Next.js 15
- React 19
- Supabase for authentication and database
- Gemini API for AI image generation
- TailwindCSS for styling
- Redux for state management

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm or yarn
- A Supabase account
- A Gemini API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ghibli-ai-generator.git
cd ghibli-ai-generator
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file with your environment variables:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- Studio Ghibli for the inspiration
- Gemini AI for the image generation capabilities
- Supabase for the authentication and database services
