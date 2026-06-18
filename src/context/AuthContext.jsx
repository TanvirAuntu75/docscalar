import { createContext, useContext, useReducer, useEffect } from 'react';

const AuthContext = createContext(null);

const AUTH_ACTIONS = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  SET_TIER: 'SET_TIER',
  HYDRATE: 'HYDRATE',
  UPDATE_EMAIL: 'UPDATE_EMAIL',
};

function authReducer(state, action) {
  switch (action.type) {
    case AUTH_ACTIONS.HYDRATE:
      return {
        ...state,
        isAuthenticated: action.payload.isAuthenticated,
        userEmail: action.payload.userEmail,
        userTier: action.payload.userTier,
        proLicenseKey: action.payload.proLicenseKey,
        accessToken: action.payload.accessToken,
      };

    case AUTH_ACTIONS.LOGIN: {
      const newState = {
        ...state,
        isAuthenticated: true,
        userEmail: action.payload.email || '',
        userTier: action.payload.tier || 'free',
        proLicenseKey: action.payload.proLicenseKey || '',
        accessToken: action.payload.accessToken || '',
      };
      // Persist to localStorage
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userEmail', newState.userEmail);
      localStorage.setItem('userTier', newState.userTier);
      localStorage.setItem('accessToken', newState.accessToken);
      if (newState.proLicenseKey) {
        localStorage.setItem('proLicenseKey', newState.proLicenseKey);
      }
      return newState;
    }

    case AUTH_ACTIONS.LOGOUT: {
      // Clear all auth data from localStorage
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userTier');
      localStorage.removeItem('proLicenseKey');
      localStorage.removeItem('accessToken');
      return {
        isAuthenticated: false,
        userEmail: '',
        userTier: 'free',
        proLicenseKey: '',
        accessToken: '',
      };
    }

    case AUTH_ACTIONS.SET_TIER: {
      const newState = {
        ...state,
        userTier: action.payload.tier,
        proLicenseKey: action.payload.proLicenseKey || state.proLicenseKey,
      };
      localStorage.setItem('userTier', newState.userTier);
      if (action.payload.proLicenseKey) {
        localStorage.setItem('proLicenseKey', action.payload.proLicenseKey);
      }
      return newState;
    }

    case AUTH_ACTIONS.UPDATE_EMAIL: {
      const newState = {
        ...state,
        userEmail: action.payload.email,
      };
      localStorage.setItem('userEmail', newState.userEmail);
      return newState;
    }

    default:
      return state;
  }
}

const initialState = {
  isAuthenticated: false,
  userEmail: '',
  userTier: 'free',
  proLicenseKey: '',
  accessToken: '',
};

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const userEmail = localStorage.getItem('userEmail') || '';
    const userTier = localStorage.getItem('userTier') || 'free';
    const proLicenseKey = localStorage.getItem('proLicenseKey') || '';
    const accessToken = localStorage.getItem('accessToken') || '';

    dispatch({
      type: AUTH_ACTIONS.HYDRATE,
      payload: { isAuthenticated, userEmail, userTier, proLicenseKey, accessToken },
    });
  }, []);

  const login = ({ email, tier = 'free', proLicenseKey = '', accessToken = '' }) => {
    dispatch({
      type: AUTH_ACTIONS.LOGIN,
      payload: { email, tier, proLicenseKey, accessToken },
    });
  };

  const logout = () => {
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
  };

  const setTier = ({ tier, proLicenseKey = '' }) => {
    dispatch({
      type: AUTH_ACTIONS.SET_TIER,
      payload: { tier, proLicenseKey },
    });
  };

  const updateEmail = (email) => {
    dispatch({
      type: AUTH_ACTIONS.UPDATE_EMAIL,
      payload: { email },
    });
  };

  const value = {
    ...state,
    isPro: state.isAuthenticated && state.userTier === 'pro',
    login,
    logout,
    setTier,
    updateEmail,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { AUTH_ACTIONS };
export default AuthContext;
