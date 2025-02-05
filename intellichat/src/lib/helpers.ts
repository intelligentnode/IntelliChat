export const serializeError = (error: any) => {
    return {
      message: error.message || 'Unknown error',
      name: error.name,
      // Add any other relevant error properties you want to capture
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  };