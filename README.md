# Modovisa React - Modern Real-Time Visitor Tracking Platform

This is a modern React + Vite + Tailwind CSS + Shadcn UI rebuild of the original Bootstrap-based Modovisa website. All functionality has been preserved and enhanced with modern web technologies.

## 🚀 Features

- **Modern Stack**: React 18, Vite, Tailwind CSS
- **Apple + Stripe Design**: Clean, modern UI inspired by Apple and Stripe
- **All Routes Preserved**: `/app/*`, `/mv-admin/*`, `/docs/*` etc.
- **Custom JS Retained**: All original JavaScript functionality migrated
- **Authentication**: Complete auth flow with JWT tokens
- **Real-time Tracking**: Live visitor tracking with charts
- **Responsive**: Mobile-first design
- **Fast**: Vite for lightning-fast development and builds

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/              # Reusable UI components (Button, Card, Input, etc.)
│   ├── layout/          # Layout components (Header, Footer, Sidebar)
│   ├── dashboard/       # Dashboard-specific components
│   └── admin/           # Admin-specific components
├── pages/
│   ├── app/             # App pages (Dashboard, LiveTracking, etc.)
│   ├── auth/            # Authentication pages (Login, Register, etc.)
│   ├── docs/            # Documentation pages
│   ├── mv-admin/        # Admin panel pages
│   ├── help/            # Help center pages
│   └── legal/           # Legal pages (Privacy, Terms, etc.)
├── contexts/            # React contexts (AuthContext, etc.)
├── hooks/               # Custom React hooks
├── lib/                 # Utility functions
├── assets/              # Images, fonts, etc.
└── App.jsx              # Main app component with routing

public/
├── css/                 # Original CSS (for reference)
├── js/                  # Original JavaScript files
├── img/                 # Images and assets
├── json/                # Data files
└── vendor/              # Third-party libraries
```

## 🛠️ Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔑 Key Routes

### Public Routes
- `/` - Landing page
- `/login` - User login
- `/register` - User registration
- `/auth/reset` - Password reset
- `/docs` - Documentation index

### Protected App Routes
- `/app/dashboard` - Main dashboard with analytics
- `/app/live-tracking` - Real-time visitor tracking
- `/app/tracking-setup` - Tracking configuration
- `/app/installation` - Installation guides
- `/app/user-profile` - User profile management

### Protected Admin Routes
- `/mv-admin/dashboard` - Admin dashboard
- `/mv-admin/users` - User management
- `/mv-admin/sites` - Site management
- `/mv-admin/billing` - Billing management
- `/mv-admin/settings` - System settings
- `/mv-admin/logs` - System logs
- `/mv-admin/permissions` - Permission management

## 🎨 Design System

### Colors
- **Primary**: Blue (#3b82f6)
- **Secondary**: Gray
- **Success**: Green
- **Destructive**: Red

### Components
- All components follow Apple/Stripe design principles
- Smooth animations and transitions
- Consistent shadows and borders
- Modern rounded corners

### Tailwind Classes
- `btn-apple` - Apple-style buttons
- `card-stripe` - Stripe-style cards
- `glass` - Glass morphism effect
- `gradient-text` - Gradient text effect

## 🔒 Authentication

Authentication is handled via JWT tokens stored in `window.__mvAccess`:

```javascript
// Check authentication
const token = window.__mvAccess?.token;

// Make authenticated requests
import { secureFetch } from './lib/utils';
const response = await secureFetch('/api/endpoint');
```

## 🎯 Custom JavaScript Migration

All original custom JavaScript has been preserved:

1. **Auth System** (`/js/auth.js`) → React Context (`contexts/AuthContext.jsx`)
2. **Dashboard Charts** (`/js/user-dashboard.js`) → Dashboard component with ECharts
3. **Live Tracking** → LiveTracking component with real-time updates
4. **Profile Management** (`/js/user-profile.js`) → UserProfile component
5. **Admin Functions** (`/js/mv-admin/*`) → Admin components

## 📱 Responsive Design

- Mobile-first approach
- Breakpoints:
  - sm: 640px
  - md: 768px
  - lg: 1024px
  - xl: 1280px
  - 2xl: 1536px

## 🚀 Deployment

### Cloudflare Pages
1. Connect your repository to Cloudflare Pages
2. Build command: `npm run build`
3. Output directory: `dist`
4. Add `_redirects` file for SPA routing:
   ```
   /*  /index.html  200
   ```

### Other Platforms
Works with Vercel, Netlify, AWS Amplify, etc.

## 🔧 Environment Variables

Create a `.env` file:

```env
VITE_API_BASE_URL=https://api.modovisa.com
VITE_STRIPE_KEY=your_stripe_key
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

## 📦 Dependencies

- **react** - UI library
- **react-router-dom** - Routing
- **tailwindcss** - Styling
- **lucide-react** - Icons
- **clsx** + **tailwind-merge** - Class name utilities
- **echarts** - Charts (loaded from CDN)

## 🐛 Known Issues

None at the moment! All original functionality has been successfully migrated.

## 📝 License

Same as original project - see LICENSE file.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For issues or questions:
- Email: support@modovisa.com
- Docs: https://modovisa.com/docs

---

Built with ❤️ using React, Vite, and Tailwind CSS
