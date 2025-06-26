# Recrootly - AI-Powered Resume Analysis Platform

Recrootly is a modern web application that helps recruiters and hiring managers analyze resumes using AI. It provides intelligent scoring, strengths/weaknesses analysis, and detailed feedback for each candidate against specific job descriptions.

## ✨ Features

- **AI-Powered Resume Analysis** - Get detailed feedback on candidate resumes
- **Job Management** - Create and manage job postings
- **Resume Scoring** - Intelligent scoring system with strengths/weaknesses breakdown
- **User Authentication** - Secure login/signup with Supabase
- **Responsive Design** - Works on desktop and mobile devices
- **Real-time Updates** - Instant feedback and analysis results
- **Data Export** - Export user data and analysis results
- **Settings Management** - Customizable sorting, auto-ranking, and data retention
- **Contact Form** - Store submissions and enable email notifications (via Zapier or Edge Functions)

## 🛠️ Tech Stack

- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **Build Tool**: Vite
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI Analysis**: OpenRouter API
- **Styling**: Custom CSS with modern design

## 📋 Prerequisites

Before running this application, you'll need:

1. **Node.js** (version 16 or higher)
2. **npm** or **yarn**
3. **OpenRouter API Key** (for AI analysis)
4. **Supabase Account** (for database and authentication)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd 
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Get API Keys

#### OpenRouter API Key (for AI Analysis)
1. Go to [OpenRouter](https://openrouter.ai/)
2. Sign up for an account
3. Navigate to your API keys section
4. Create a new API key
5. Copy the API key

#### Supabase Setup (for Database & Authentication)
1. Go to [Supabase](https://supabase.com/)
2. Create a new project
3. Go to Settings → API
4. Copy your **Project URL** and **anon/public key**

### 4. Configure Environment Variables

Create a `.env` file in the project root:

```bash
# OpenRouter API Configuration
VITE_OPENROUTER_API_KEY=your_openrouter_api_key_here

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**Important**: Replace the placeholder values with your actual API keys.

### 5. Set Up Supabase Database

You'll need to create the following tables in your Supabase database:

#### Jobs Table
```sql
CREATE TABLE jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Resumes Table
```sql
CREATE TABLE resumes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  score INTEGER,
  strengths TEXT[],
  weaknesses TEXT[],
  assessment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Contact Submissions Table
```sql
CREATE TABLE contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon insert" ON contact_submissions
  FOR INSERT TO anon
  WITH CHECK (true);
```

#### Row Level Security (RLS) Policies
```sql
-- Enable RLS
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

-- Jobs policies
CREATE POLICY "Users can view their own jobs" ON jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own jobs" ON jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs" ON jobs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own jobs" ON jobs
  FOR DELETE USING (auth.uid() = user_id);

-- Resumes policies
CREATE POLICY "Users can view resumes for their jobs" ON resumes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = resumes.job_id 
      AND jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert resumes for their jobs" ON resumes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = resumes.job_id 
      AND jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update resumes for their jobs" ON resumes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = resumes.job_id 
      AND jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete resumes for their jobs" ON resumes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = resumes.job_id 
      AND jobs.user_id = auth.uid()
    )
  );
```

### 6. Run the Application

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 🛠️ Usage

### Getting Started
1. **Sign Up/Login** - Create an account or log in to your existing account
2. **Create a Job** - Add a new job posting with title and description
3. **Add Resumes** - Upload or paste resume content for candidates
4. **Analyze** - Get AI-powered analysis with scores and feedback

### Resume Analysis Features
- **AI Scoring** - Intelligent scoring from 0-100
- **Strengths Analysis** - Key strengths identified by AI
- **Weaknesses Analysis** - Areas for improvement
- **Detailed Assessment** - Comprehensive feedback and recommendations

### Available AI Models
- `mistralai/mistral-7b-instruct:free` (default, free tier)
- `openai/gpt-3.5-turbo` (paid)
- `anthropic/claude-3-haiku` (paid)
- `google/gemini-pro` (paid)

### Settings & Customization
- **Sort Order** - Sort resumes by score, date, or name
- **Auto-ranking** - Automatically rank applicants by score
- **Data Retention** - Set how long to keep data (30-90 days)
- **Export Data** - Download your analysis results

## 🔒 Security

- **Environment Variables** - All API keys are stored securely in `.env` files
- **Row Level Security** - Database access is restricted to authenticated users
- **Input Validation** - All user inputs are validated and sanitized
- **HTTPS** - Use HTTPS in production for secure data transmission

## ⚠️ Important Security Notes

- **Never commit your `.env` file** to version control
- **Keep your API keys private** - don't share them publicly
- **Use different API keys** for development and production
- **Monitor your API usage** to avoid unexpected charges

## 🐛 Troubleshooting

### Common Issues

1. **"API key is not configured"**
   - Make sure you've created a `.env` file
   - Verify your API keys are correct
   - Restart the development server after creating `.env`

2. **"API request failed"**
   - Check your internet connection
   - Verify your OpenRouter API key is valid
   - Check your API usage limits

3. **"Authentication error"**
   - Verify your Supabase credentials
   - Check that RLS policies are set up correctly
   - Ensure your Supabase project is active

4. **"Database connection failed"**
   - Verify your Supabase URL and anon key
   - Check that your Supabase project is not paused
   - Ensure the database tables are created

5. **"Cannot use 'import.meta' outside a module"**
   - Make sure your script tags have `type="module"`
   - Check that Vite is properly configured

### Debug Mode

To enable debug logging for resume analysis:
```javascript
localStorage.setItem('debugResumeAnalysis', 'true');
```

## 📁 Project Structure
recrootly/
├── index.html # Landing page
├── dashboard.html # Main dashboard
├── settings.html # User settings
├── index.js # Landing page logic
├── dashboard.js # Dashboard functionality
├── settings.js # Settings management
├── resumeAnalysis.js # AI analysis module
├── config.js # Configuration and API keys
├── index.css # Landing page styles
├── dashboard.css # Dashboard styles
├── settings.css # Settings styles
├── vite.config.js # Vite configuration
├── package.json # Dependencies
└── .env # Environment variables (not in repo)

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Vercel/Netlify

1. Connect your repository to Vercel or Netlify
2. Set environment variables in your deployment platform
3. Deploy automatically on push to main branch

### Environment Variables for Production

Make sure to set these in your deployment platform:
- `VITE_OPENROUTER_API_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🪧 Acknowledgments

- [OpenRouter](https://openrouter.ai/) for AI model access
- [Supabase](https://supabase.com/) for database and authentication
- [Vite](https://vitejs.dev/) for build tooling

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Search existing [Issues](../../issues)
3. Create a new issue with detailed information

---

**Made with ❤️ for recruiters and hiring managers**
