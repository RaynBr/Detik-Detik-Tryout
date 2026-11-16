import React from 'react';
import { AnnouncementManagementPage } from './announcements/AnnouncementManagementPage';

export const AdminAnnouncementsPage: React.FC = () => {
  return <AnnouncementManagementPage scope="admin" />;
};

