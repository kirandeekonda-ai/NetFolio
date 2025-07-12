import { FC } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface CardProps extends Omit<HTMLMotionProps<"div">, "className"> {
  hover?: boolean;
  className?: string;
}

export const Card: FC<CardProps> = ({
  children,
  className = '',
  hover = false,
  ...props
}) => {
  const baseStyles = 'bg-white rounded-lg shadow-sm p-4';
  const hoverStyles = hover ? 'transition-all duration-200 hover:shadow-md' : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${baseStyles} ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
};
