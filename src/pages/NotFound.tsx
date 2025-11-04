import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { logger } from "@/utils/logger";
import { supabase } from "@/integrations/supabase/client";

const NotFound = () => {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    logger.warn("Page not found", "NotFound", {
      pathname: location.pathname,
      referrer: document.referrer
    });
  }, [location.pathname]);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setIsAuthenticated(!!data.session);
      } catch (error) {
        logger.error(
          "Failed to check auth session",
          error instanceof Error ? error : new Error(String(error)),
          "NotFound",
          { error }
        );
        setIsAuthenticated(false);
      }
    };
    void checkSession();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-gray-600">Oops! Page not found</p>
        {isAuthenticated ? (
          <Link to="/workspace/dashboard" className="text-blue-500 underline hover:text-blue-700">
            Go to Workspace
          </Link>
        ) : (
          <Link to="/" className="text-blue-500 underline hover:text-blue-700">
            Return to Home
          </Link>
        )}
      </div>
    </div>
  );
};

export default NotFound;
