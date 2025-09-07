/**
 * PageHeader Component
 * Consistent page header with title, subtitle, and actions
 */
import React from 'react';
import { Box, Typography, Breadcrumbs, Link, Chip } from '@mui/material';
import { NavigateNext as NavigateNextIcon } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { colors, spacing } from '../../styles/theme';

interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  status?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: string | number;
  badgeColor?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
}

const HeaderContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  paddingBottom: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const HeaderContent = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: spacing.lg,
});

const TitleSection = styled(Box)({
  flex: 1,
});

const TitleContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: spacing.md,
  marginBottom: spacing.sm,
});

const IconWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 40,
  height: 40,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: colors.primary.main + '10',
  color: colors.primary.main,
}));

const ActionsContainer = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  gap: spacing.sm,
});

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  actions,
  status,
  icon,
  badge,
  badgeColor = 'primary',
}) => {
  return (
    <HeaderContainer>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="small" />}
          sx={{ mb: 2 }}
        >
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            
            if (isLast) {
              return (
                <Typography key={index} color="text.primary" variant="body2">
                  {crumb.label}
                </Typography>
              );
            }
            
            if (crumb.href) {
              return (
                <Link
                  key={index}
                  href={crumb.href}
                  color="inherit"
                  variant="body2"
                  underline="hover"
                >
                  {crumb.label}
                </Link>
              );
            }
            
            if (crumb.onClick) {
              return (
                <Link
                  key={index}
                  component="button"
                  onClick={crumb.onClick}
                  color="inherit"
                  variant="body2"
                  underline="hover"
                  sx={{ cursor: 'pointer' }}
                >
                  {crumb.label}
                </Link>
              );
            }
            
            return (
              <Typography key={index} color="text.secondary" variant="body2">
                {crumb.label}
              </Typography>
            );
          })}
        </Breadcrumbs>
      )}
      
      <HeaderContent>
        <TitleSection>
          <TitleContainer>
            {icon && <IconWrapper>{icon}</IconWrapper>}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h4" component="h1">
                {title}
              </Typography>
              {badge && (
                <Chip
                  label={badge}
                  color={badgeColor}
                  size="small"
                  variant="filled"
                />
              )}
            </Box>
          </TitleContainer>
          
          {subtitle && (
            <Typography variant="body1" color="text.secondary">
              {subtitle}
            </Typography>
          )}
          
          {status && (
            <Box sx={{ mt: 1 }}>
              {status}
            </Box>
          )}
        </TitleSection>
        
        {actions && (
          <ActionsContainer>
            {actions}
          </ActionsContainer>
        )}
      </HeaderContent>
    </HeaderContainer>
  );
};

export default PageHeader;
