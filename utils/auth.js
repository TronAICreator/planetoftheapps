// Simple email validation
export const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Session management functions
export const setUserSession = (user) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('isAuthenticated', 'true');
  }
};

export const getUserSession = () => {
  if (typeof window !== 'undefined') {
    const user = localStorage.getItem('user');
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    return {
      user: user ? JSON.parse(user) : null,
      isAuthenticated: isAuthenticated === 'true'
    };
  }
  return { user: null, isAuthenticated: false };
};

export const clearUserSession = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
  }
};

export const isUserAuthenticated = () => {
  const { isAuthenticated, user } = getUserSession();
  return isAuthenticated && user;
};

export const isUserAdmin = () => {
  const { user } = getUserSession();
  return user && user.role === 'admin';
};

// User accounts database (in production, this would be in a real database)
const USERS = [
  {
    id: '1',
    email: 'ssrphonicsacademy@gmail.com',
    password: 'SpaceWalk!!_25',
    name: 'Admin',
    role: 'admin',
    createdAt: new Date().toISOString(),
    lastLogin: null,
    resetToken: null,
    resetTokenExpiry: null
  },
  {
    id: '2',
    email: 'jairdandantas@gmail.com',
    password: 'SpaceWalk!!_25',
    name: 'Student',
    role: 'student',
    createdAt: new Date().toISOString(),
    lastLogin: null,
    resetToken: null,
    resetTokenExpiry: null
  }
];

// Helper function to find user by email
export const findUserByEmail = (email) => {
  return USERS.find(user => user.email.toLowerCase() === email.toLowerCase());
};

// Helper function to update user
export const updateUser = (userId, updates) => {
  const userIndex = USERS.findIndex(user => user.id === userId);
  if (userIndex !== -1) {
    USERS[userIndex] = { ...USERS[userIndex], ...updates };
    return USERS[userIndex];
  }
  return null;
};

// Generate random reset token
export const generateResetToken = () => {
  return Math.random().toString(36).substr(2, 15) + Math.random().toString(36).substr(2, 15);
};

// Simulate authentication (replace with your actual auth service)
export const authenticateUser = async (email, password) => {
  try {
    // In a real app, this would call your authentication service
    // For demo, we'll simulate a network call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Find user by email
    const user = findUserByEmail(email);
    
    if (!user || user.password !== password) {
      return {
        success: false,
        error: "Invalid email or password"
      };
    }

    // Update last login
    updateUser(user.id, { lastLogin: new Date().toISOString() });

    return { 
      success: true, 
      user: { 
        id: user.id,
        email: user.email, 
        name: user.name, 
        role: user.role,
        lastLogin: user.lastLogin
      } 
    };
  } catch (error) {
    return {
      success: false,
      error: "Authentication failed. Please try again."
    };
  }
};

// Simulate password reset request
export const requestPasswordReset = async (email) => {
  try {
    // In a real app, this would:
    // 1. Generate a secure reset token
    // 2. Save it to the database with an expiry
    // 3. Send an email with a reset link
    await new Promise(resolve => setTimeout(resolve, 1000));

    const user = findUserByEmail(email);
    if (!user) {
      // For security, don't reveal if email exists
      return {
        success: true,
        message: "If an account exists with this email, you will receive a password reset link shortly."
      };
    }

    // Generate reset token and set expiry (15 minutes from now)
    const resetToken = generateResetToken();
    const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Update user with reset token
    updateUser(user.id, { resetToken, resetTokenExpiry });

    // Simulate email sending
    console.log(`Password reset email sent to: ${email}`);
    console.log(`Reset token: ${resetToken} (expires in 15 minutes)`);
    console.log(`Reset URL: http://localhost:3000/reset-password?token=${resetToken}`);

    return {
      success: true,
      message: "If an account exists with this email, you will receive a password reset link shortly.",
      // For demo purposes, include the token (remove in production)
      resetToken: resetToken
    };
  } catch (error) {
    return {
      success: false,
      error: "Failed to send reset email. Please try again."
    };
  }
};

// Simulate password reset verification
export const resetPassword = async (token, newPassword) => {
  try {
    // In a real app, this would:
    // 1. Verify the reset token
    // 2. Check it hasn't expired
    // 3. Update the password in your database
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Find user by reset token
    const user = USERS.find(u => u.resetToken === token);
    if (!user) {
      return {
        success: false,
        error: "Invalid reset token."
      };
    }

    // Check if token has expired
    const now = new Date();
    const tokenExpiry = new Date(user.resetTokenExpiry);
    if (now > tokenExpiry) {
      return {
        success: false,
        error: "Reset token has expired. Please request a new one."
      };
    }

    // Validate new password
    if (!newPassword || newPassword.length < 6) {
      return {
        success: false,
        error: "Password must be at least 6 characters long."
      };
    }

    // Update password and clear reset token
    updateUser(user.id, { 
      password: newPassword, 
      resetToken: null, 
      resetTokenExpiry: null 
    });

    return {
      success: true,
      message: "Password has been reset successfully."
    };
  } catch (error) {
    return {
      success: false,
      error: "Failed to reset password. Please try again."
    };
  }
};

// Get all users (for admin purposes)
export const getAllUsers = () => {
  return USERS.map(user => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin
  }));
};

// Change password (when user is logged in)
export const changePassword = async (userId, currentPassword, newPassword) => {
  try {
    const user = USERS.find(u => u.id === userId);
    if (!user) {
      return {
        success: false,
        error: "User not found."
      };
    }

    if (user.password !== currentPassword) {
      return {
        success: false,
        error: "Current password is incorrect."
      };
    }

    if (!newPassword || newPassword.length < 6) {
      return {
        success: false,
        error: "New password must be at least 6 characters long."
      };
    }

    updateUser(userId, { password: newPassword });

    return {
      success: true,
      message: "Password changed successfully."
    };
  } catch (error) {
    return {
      success: false,
      error: "Failed to change password. Please try again."
    };
  }
};
