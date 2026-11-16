import React from 'react';
import { AnnouncementManagementPage } from '../admin/announcements/AnnouncementManagementPage';

export const TeacherAnnouncementsPage: React.FC = () => {
  return <AnnouncementManagementPage scope="guru" />;
};

