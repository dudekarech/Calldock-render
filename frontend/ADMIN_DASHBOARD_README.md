# CallDocker Admin Dashboard

## Overview

The CallDocker Admin Dashboard is a comprehensive web-based administration interface that provides system administrators with complete control over the CallDocker platform. It offers user management, company administration, analytics, and system monitoring capabilities.

## Features

### 🎯 **Core Dashboard**
- **Overview Metrics**: Key performance indicators at a glance
- **Real-time Statistics**: Live updates on system performance
- **Quick Actions**: Fast access to common administrative tasks

### 👥 **User Management**
- **User CRUD Operations**: Create, read, update, and delete users
- **Role Management**: Assign and manage user roles (Super Admin, Company Admin, Agent)
- **Company Association**: Link users to specific companies
- **Status Tracking**: Monitor user activity and account status
- **Search & Filtering**: Advanced search and filtering capabilities

### 🏢 **Company Management**
- **Company Administration**: Manage company accounts and settings
- **Plan Management**: Handle subscription plans (Starter, Professional, Enterprise)
- **Status Control**: Approve, suspend, or activate companies
- **Performance Metrics**: Track company usage and performance
- **Bulk Operations**: Manage multiple companies efficiently

### 📊 **Analytics & Reporting**
- **Call Volume Trends**: Visual representation of call patterns
- **Performance Metrics**: Detailed performance analytics
- **Company Rankings**: Top-performing companies and agents
- **Export Capabilities**: Generate and download reports
- **Custom Date Ranges**: Flexible time period selection

### ⚙️ **System Settings** (Coming Soon)
- **Platform Configuration**: System-wide settings and preferences
- **Security Settings**: Authentication and authorization controls
- **Integration Management**: Third-party service configurations
- **Backup & Recovery**: System backup and restoration tools

## Technology Stack

- **Frontend**: HTML5, Tailwind CSS, Vanilla JavaScript
- **Charts**: Chart.js for data visualization
- **Icons**: Font Awesome for UI icons
- **Responsive Design**: Mobile-first responsive layout
- **Modular Architecture**: Component-based page loading

## File Structure

```
frontend/
├── admin-dashboard.html          # Main dashboard interface
├── admin-users.html             # User management component
├── admin-companies.html         # Company management component
├── admin-analytics.html         # Analytics and reporting component
└── ADMIN_DASHBOARD_README.md    # This documentation
```

## Getting Started

### 1. Access the Dashboard
Navigate to the admin dashboard:
```
http://localhost:8080/admin-dashboard.html
```

### 2. Navigation
Use the left sidebar to navigate between different sections:
- **Dashboard**: Overview and key metrics
- **Users**: User management interface
- **Companies**: Company administration
- **Calls**: Call monitoring (coming soon)
- **Analytics**: Performance reports and insights
- **Settings**: System configuration (coming soon)

### 3. User Management
1. Click on "Users" in the sidebar
2. Use the search and filter options to find specific users
3. Click "Add User" to create new user accounts
4. Use the action buttons to edit or delete existing users

### 4. Company Management
1. Click on "Companies" in the sidebar
2. View company statistics and performance metrics
3. Click "Add Company" to register new companies
4. Manage company status and subscription plans

### 5. Analytics
1. Click on "Analytics" in the sidebar
2. Select your desired date range
3. View charts and performance metrics
4. Export reports as needed

## User Roles & Permissions

### Super Admin
- **Full Access**: Complete system control
- **User Management**: Create, edit, and delete any user
- **Company Management**: Manage all companies
- **System Settings**: Configure platform-wide settings

### Company Admin
- **Company Users**: Manage users within their company
- **Company Settings**: Configure company-specific settings
- **Limited Access**: Cannot access other companies or system settings

### Agent
- **Read-Only**: View-only access to relevant information
- **Personal Settings**: Manage personal account settings
- **Call History**: View their own call history

## API Integration

The dashboard is designed to integrate with the CallDocker backend services:

- **Auth Service**: User authentication and authorization
- **User Service**: User management operations
- **Company Service**: Company administration
- **Call Service**: Call monitoring and analytics
- **Analytics Service**: Performance metrics and reporting

## Customization

### Adding New Pages
1. Create a new HTML component file
2. Implement the required JavaScript functions
3. Add navigation item to the sidebar
4. Update the main dashboard to load the new component

### Modifying Existing Components
Each component is self-contained and can be modified independently:
- **HTML Structure**: Update the component HTML file
- **JavaScript Logic**: Modify the component's JavaScript functions
- **Styling**: Customize using Tailwind CSS classes

### Theme Customization
The dashboard uses Tailwind CSS for styling:
- **Colors**: Modify color schemes in the CSS classes
- **Layout**: Adjust spacing and grid layouts
- **Components**: Customize component appearance

## Security Features

- **Role-Based Access Control**: Different views based on user roles
- **Session Management**: Secure user sessions
- **Input Validation**: Client-side and server-side validation
- **CSRF Protection**: Cross-site request forgery prevention
- **Secure Communication**: HTTPS/WSS for data transmission

## Performance Optimization

- **Lazy Loading**: Components load only when needed
- **Efficient Rendering**: Optimized DOM manipulation
- **Chart Optimization**: Responsive chart rendering
- **Caching**: Browser caching for static assets

## Browser Support

- **Chrome**: 90+ (Recommended)
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

## Troubleshooting

### Common Issues

#### Page Not Loading
- Check if the HTTP server is running
- Verify file paths and permissions
- Check browser console for JavaScript errors

#### Charts Not Displaying
- Ensure Chart.js is loaded correctly
- Check for JavaScript errors in the console
- Verify canvas elements exist in the DOM

#### Functionality Not Working
- Check browser console for error messages
- Verify all required JavaScript functions are defined
- Ensure proper event listener setup

### Debug Mode
Enable debug logging in the browser console:
```javascript
localStorage.setItem('debug', 'true');
```

## Future Enhancements

### Phase 2 Features
- **Real-time Updates**: WebSocket integration for live data
- **Advanced Filtering**: Complex search and filter options
- **Bulk Operations**: Mass user and company management
- **Audit Logging**: Comprehensive activity tracking

### Phase 3 Features
- **Mobile App**: Native mobile application
- **Advanced Analytics**: Machine learning insights
- **Custom Reports**: User-defined report builder
- **API Management**: Developer portal and API keys

## Contributing

1. Follow the existing code structure and patterns
2. Ensure responsive design for all screen sizes
3. Add proper error handling and validation
4. Include comprehensive documentation for new features
5. Test across different browsers and devices

## Support

For technical support and questions:
- Check the troubleshooting section
- Review browser console for error messages
- Consult the CallDocker backend documentation
- Contact the development team

## License

This project is licensed under the MIT License - see the LICENSE file for details.
