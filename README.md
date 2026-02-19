# Angel's Dry Cleaners - Management System

A modern, React-based dry cleaning business management system with an intuitive interface designed for business owners.

## 🚀 Features

- **Modern React UI**: Built with React 18, Vite, and Tailwind CSS
- **Dashboard**: Real-time overview of orders, revenue, and pending tasks
- **Order Management**: Create and track dry cleaning tickets
- **Customer Management**: Monthly billing and subscription tracking
- **Worker Management**: Track staff work and calculate wages
- **Settings**: Customizable pricing for different service types
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Toast Notifications**: User-friendly feedback for all actions
- **Real-time Updates**: Instant data synchronization

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Drycleaningbusinesswebsite
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   MONGO_URI=mongodb://127.0.0.1:27017/laundryDB
   PORT=3000
   NODE_ENV=development
   ```

4. **Start MongoDB**
   Make sure MongoDB is running on your system.

## 🚀 Running the Application

### Development Mode

1. **Start the backend server** (Terminal 1):
   ```bash
   npm run server
   ```
   The API server will run on `http://localhost:3000`

2. **Start the React development server** (Terminal 2):
   ```bash
   npm run dev
   ```
   The frontend will run on `http://localhost:5173`

### Production Mode

1. **Build the React application**:
   ```bash
   npm run build
   ```

2. **Set NODE_ENV to production**:
   ```bash
   export NODE_ENV=production
   # or on Windows:
   set NODE_ENV=production
   ```

3. **Start the server**:
   ```bash
   npm run server
   ```
   The application will be available at `http://localhost:3000`

## 🔐 Default Login Credentials

- **Username**: `admin`
- **Password**: `admin`

## 📁 Project Structure

```
Drycleaningbusinesswebsite/
├── src/
│   ├── components/      # Reusable React components
│   │   ├── Layout.jsx
│   │   └── OrderModal.jsx
│   ├── pages/           # Page components
│   │   ├── Dashboard.jsx
│   │   ├── Orders.jsx
│   │   ├── Customers.jsx
│   │   ├── Workers.jsx
│   │   ├── Settings.jsx
│   │   ├── Login.jsx
│   │   └── Home.jsx
│   ├── utils/           # Utility functions
│   │   └── api.js       # API client
│   ├── App.jsx          # Main app component
│   ├── main.jsx         # Entry point
│   └── index.css        # Global styles
├── db/                  # Database schemas
│   ├── OrderSchema.js
│   ├── CustomerSchema.js
│   └── LogSchema.js
├── server.js            # Express backend server
├── vite.config.js       # Vite configuration
├── tailwind.config.js   # Tailwind CSS configuration
└── package.json         # Dependencies
```

## 🎨 Technology Stack

### Frontend
- **React 18**: UI library
- **React Router**: Client-side routing
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **React Hot Toast**: Toast notifications
- **Axios**: HTTP client
- **date-fns**: Date formatting

### Backend
- **Node.js**: Runtime environment
- **Express**: Web framework
- **MongoDB**: Database
- **Mongoose**: ODM for MongoDB

## 📝 API Endpoints

### Orders
- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create new order
- `PATCH /api/orders/:id` - Update order
- `DELETE /api/orders/:id` - Delete order

### Customers
- `GET /api/customers` - Get all customers
- `POST /api/customers` - Create new customer
- `PATCH /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Worker Logs
- `GET /api/worker-logs` - Get all worker logs
- `POST /api/worker-logs` - Create new log
- `DELETE /api/worker-logs/:id` - Delete log

## 🎯 Key Improvements

1. **Modern UI/UX**: Clean, intuitive interface with smooth animations
2. **Better Performance**: Fast loading with Vite and optimized React components
3. **Responsive Design**: Works perfectly on all screen sizes
4. **Real-time Feedback**: Toast notifications for all user actions
5. **Better Data Visualization**: Clear stats and organized tables
6. **Improved Forms**: Better validation and user experience
7. **Component Reusability**: Modular code structure for easy maintenance

## 🔧 Customization

### Changing Colors
Edit `tailwind.config.js` to customize the color scheme:
```js
colors: {
  primary: {
    DEFAULT: '#0F766E',
    dark: '#115E59',
    light: '#2DD4BF',
  },
  // ... more colors
}
```

### Adding New Features
The component-based architecture makes it easy to add new features:
1. Create new components in `src/components/`
2. Add new pages in `src/pages/`
3. Update routing in `src/App.jsx`

## 📄 License

ISC

## 👥 Support

For issues or questions, please open an issue on the repository.

---

**Built with ❤️ for Angel's Dry Cleaners**
