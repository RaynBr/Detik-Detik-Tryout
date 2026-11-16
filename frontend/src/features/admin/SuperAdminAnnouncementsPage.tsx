import React from 'react';
import { AnnouncementManagementPage } from './announcements/AnnouncementManagementPage';

export const SuperAdminAnnouncementsPage: React.FC = () => {
  return <AnnouncementManagementPage scope="super_admin" />;
};

