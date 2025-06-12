
import React from 'react';
import CustomToast from './custom-toast';
import { useCustomToast } from '@/hooks/useCustomToast';

const CustomToastContainer: React.FC = () => {
  const { toasts, removeToast } = useCustomToast();

  return (
    <>
      {toasts.map((toast) => (
        <CustomToast
          key={toast.id}
          {...toast}
          onRemove={removeToast}
        />
      ))}
    </>
  );
};

export default CustomToastContainer;
