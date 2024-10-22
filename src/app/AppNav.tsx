'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import {
  AppBar,
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LoginIcon from '@mui/icons-material/Login';

import { signOut } from 'next-auth/react';
import { stringAvatar } from '@/utils';
import { UserInfo } from '@/types';

const drawerWidth = 240;

type NavItem = {
  key: string;
  title: string;
  href: string;
};

const navItems: (NavItem | string)[] = [
  { key: 'home', title: 'Home', href: '/' },
  { key: 'logs', title: 'Logs', href: '/logs' },
  'About', 'Contact',
];

const settings = ['Profile', 'Account', 'Dashboard', 'Logout'];

export interface AppNavProps {
  user?: UserInfo;
}

export default function AppNav({ user }: AppNavProps) {
  const theme = useTheme();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);

  const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleOpenUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorElUser(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleSettingsClick = (setting: string) => {
    if (setting === 'Logout') {
      signOut();
    }

    handleCloseUserMenu();
  };

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
      <Typography variant="h6" sx={{ my: 2 }}>
        OverHours
      </Typography>
      <Divider />
      <List>
        {navItems.map((item) => {
          const key = typeof item === 'object' ? item.key : item;
          const title = typeof item === 'object' ? item.title : item;
          const href = typeof item === 'object' ? item.href : undefined;

          return (
            <ListItem key={key} disablePadding>
              <ListItemButton
                sx={{ textAlign: 'center' }}
                onClick={() => href && router.push(href)}
              >
                <ListItemText primary={title} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            sx={{ mr: 2, display: { sm: 'none' } }}
            onClick={handleDrawerToggle}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h4" component={Link} sx={{ flexGrow: 1 }} href="/">
            OverHours
          </Typography>

          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            {navItems.map((item) => {
              const key = typeof item === 'object' ? item.key : item;
              const title = typeof item === 'object' ? item.title : item;
              const href = typeof item === 'object' ? item.href : undefined;

              return (
                <Button
                  key={key}
                  sx={{ color: '#fff' }}
                  onClick={() => href && router.push(href)}
                >
                  {title}
                </Button>
              );
            })}
          </Box>

          <Box sx={{ flexGrow: 0, paddingLeft: theme.spacing(1) }}>
            {user ? (
              <Tooltip title="Open settings">
                <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                  <Avatar {...stringAvatar(user?.name ?? '')} />
                </IconButton>
              </Tooltip>
            )
              : (
                <Button
                  startIcon={<LoginIcon />}
                  variant="contained"
                  color="secondary"
                  onClick={() => router.push('/login')}
                >
                  Login
                </Button>
              )}
            <Menu
              sx={{ mt: '45px' }}
              anchorEl={anchorElUser}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
            >
              {settings.map((setting) => (
                <MenuItem key={setting} onClick={() => handleSettingsClick(setting)}>
                  <Typography sx={{ textAlign: 'center' }}>{setting}</Typography>
                </MenuItem>
              ))}
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      <nav>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
      </nav>
    </>
  );
}
