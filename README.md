# SEO Dashboard

A comprehensive SEO dashboard built with Next.js, TypeScript, Prisma, and PostgreSQL for agencies managing multiple clients and brands.

## Features

### 🏢 Brand Management
- Add and manage multiple brands/clients
- Organize all SEO activities by brand
- Track brand-specific metrics and performance

### 📱 App Rankings Tracking
- Track Android and iOS app store rankings
- Upload daily ranking data via tab-separated files
- Visualize ranking trends with interactive charts
- Support for multiple countries and keywords
- Historical data storage and analysis

### 🔍 Keyword Tracking
- Monitor keyword rankings across different countries
- Integration with SEMRush API (planned)
- Historical ranking data visualization
- Track position changes over time

### 🔗 Backlinks Management
- Comprehensive backlink portfolio management
- Track domain rating, traffic, and status
- Monitor supplier information and pricing
- Status tracking (Pending, Published, Rejected, Expired)
- Cost analysis and ROI tracking

### 📝 Article Monitoring
- Content production workflow management
- Track article status from draft to publication
- SEO check, plagiarism detection, and AI content flags
- Writer assignment and word count tracking
- Publication date management

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Charts**: Recharts
- **Icons**: Heroicons

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd seodashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your configuration:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/seodashboard"
   
   # Next.js
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here"
   
   # SEMRush API (optional)
   SEMRUSH_API_KEY="your-semrush-api-key-here"
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push database schema
   npm run db:push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Database Schema

The application uses the following main entities:

- **Users**: Dashboard users
- **Brands**: Client/brand management
- **Apps**: Mobile applications (Android/iOS)
- **AppRankings**: Daily app ranking data
- **Keywords**: SEO keywords to track
- **KeywordRankings**: Historical keyword positions
- **Backlinks**: Backlink portfolio management
- **Articles**: Content production tracking

## Usage

### Adding Your First Brand

1. Navigate to the dashboard homepage
2. Click "Add New Brand"
3. Fill in brand details
4. Start adding apps, keywords, backlinks, and articles

### Uploading App Rankings

1. Go to the App Rankings page
2. Select an app or create a new one
3. Prepare your data in tab-separated format:
   ```
   Keyword	Country	Rank	Score	Traffic
   betting	GB	0	61	1274
   betting apps	GB	192	45	264
   ```
4. Upload the file and track the results

### Managing Keywords

1. Navigate to the Keywords page
2. Click "Add Keyword"
3. Enter the keyword, country, and select a brand
4. View historical rankings and trends

### Tracking Backlinks

1. Go to the Backlinks page
2. Add new backlinks with all relevant details
3. Track status, pricing, and supplier information
4. Monitor your backlink portfolio growth

### Managing Articles

1. Navigate to the Articles page
2. Add new articles with writer assignments
3. Track status through the content workflow
4. Monitor SEO checks and publication dates

## File Upload Formats

### App Rankings Data
Use tab-separated values with the following columns:
- `Keyword`: The keyword being tracked
- `Country`: Two-letter country code (e.g., GB, US, CA)
- `Rank`: Current ranking position
- `Score`: App store score (optional)
- `Traffic`: Estimated traffic (optional)

## API Endpoints

### Brands
- `GET /api/brands` - List all brands
- `POST /api/brands` - Create new brand

### Apps
- `GET /api/apps` - List all apps
- `POST /api/apps` - Create new app

### App Rankings
- `POST /api/app-rankings/upload` - Upload ranking data
- `GET /api/app-rankings/upload` - Get ranking history

### Keywords
- `GET /api/keywords` - List all keywords
- `POST /api/keywords` - Add new keyword

### Backlinks
- `GET /api/backlinks` - List all backlinks
- `POST /api/backlinks` - Create new backlink
- `PUT /api/backlinks` - Update backlink
- `DELETE /api/backlinks` - Delete backlink

### Articles
- `GET /api/articles` - List all articles
- `POST /api/articles` - Create new article
- `PUT /api/articles` - Update article
- `DELETE /api/articles` - Delete article

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:studio` - Open Prisma Studio

### Database Management

```bash
# View and edit database
npm run db:studio

# Reset database (development only)
npx prisma db push --force-reset

# Generate migrations (production)
npx prisma migrate dev
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For support and questions, please open an issue in the repository or contact the development team.
