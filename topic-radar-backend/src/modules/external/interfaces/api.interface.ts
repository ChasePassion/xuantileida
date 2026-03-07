export interface HotArticleItem {
  title: string;
  author: string;
  accountName: string;
  url: string;
  readCount: number;
  likeCount: number;
  publishedAt: string;
  category?: string;
}

export interface VideoSearchResult {
  title: string;
  coverUrl: string;
  videoUrl: string;
  duration: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  creatorName: string;
  creatorId: string;
  platform: string;
}

export interface LlmTopicExtraction {
  keyword: string;
  reason: string;
  angles: string[];
  heatScore: number;
  category: string;
}

export interface DouyinVideoResult {
  awemeId: string;
  title: string;
  createTime: number;
  authorUid: string;
  authorNickname: string;
  authorAvatar: string;
  authorSecUid: string;
  commentCount: number;
  diggCount: number;
  shareCount: number;
  collectCount: number;
}

export interface KuaishouVideoResult {
  photoId: string;
  title: string;
  createTime: number;
  userName: string;
  userId: string;
  collectCount: number;
  commentCount: number;
  likeCount: number;
  shareCount: number;
  viewCount: number;
}

export interface KuaishouHotItem {
  keyword: string;
  hotValue: number;
}
