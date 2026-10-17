import check from "@iconify/icons-fluent/checkmark-circle-20-regular";
import rate from "@iconify/icons-fluent/top-speed-20-regular";
import list from "@iconify/icons-fluent/text-bullet-list-square-20-regular";
import arrow from "@iconify/icons-fluent/arrow-left-20-regular";
import playFill from "@iconify/icons-fluent/play-20-filled";
import play from "@iconify/icons-fluent/play-20-regular";
import next from "@iconify/icons-fluent/next-20-regular";
import empty from "@iconify/icons-fluent/box-dismiss-20-regular";
import search from "@iconify/icons-fluent/search-20-regular";
import loading from "@iconify/icons-fluent/spinner-ios-20-filled";
import video from "@iconify/icons-fluent/video-20-filled";
import film from "@iconify/icons-fluent/filmstrip-20-regular";
import filmFill from "@iconify/icons-fluent/video-clip-multiple-20-filled";
import remove from "@iconify/icons-fluent/delete-20-regular";
import brightness from "@iconify/icons-fluent/brightness-high-20-regular";
import volume2 from "@iconify/icons-fluent/speaker-2-20-regular";
import volume1 from "@iconify/icons-fluent/speaker-1-20-regular";
import volumeOff from "@iconify/icons-fluent/speaker-off-20-regular";
import detail from "@iconify/icons-fluent/apps-list-detail-20-regular";
import offline from "@iconify/icons-fluent/wifi-off-20-regular";
import history from "@iconify/icons-fluent/history-20-regular";
import close from "@iconify/icons-fluent/dismiss-circle-20-filled";
import enter from "@iconify/icons-fluent/arrow-enter-left-20-regular";
import more from "@iconify/icons-fluent/more-horizontal-20-regular";
import home from "@iconify/icons-fluent/home-20-regular";
import category from "@iconify/icons-fluent/grid-20-regular";
import setting from "@iconify/icons-fluent/settings-20-regular";
import source from "@iconify/icons-fluent/sound-source-20-regular";
import update from "@iconify/icons-fluent/arrow-circle-up-20-regular";
import bug from "@iconify/icons-fluent/bug-20-regular";
import globe from "@iconify/icons-fluent/globe-20-regular";
import about from "@iconify/icons-fluent/error-circle-20-regular";
import add from "@iconify/icons-fluent/add-circle-20-regular";
import link from "@iconify/icons-fluent/link-20-regular";
import tag from "@iconify/icons-fluent/tag-20-regular";
import tv from "@iconify/icons-fluent/tv-20-regular";
import movie from "@iconify/icons-fluent/movies-and-tv-20-regular";
import fullscreenOn from "@iconify/icons-fluent/full-screen-maximize-20-regular";
import fullscreenOff from "@iconify/icons-fluent/full-screen-minimize-20-regular";
import pip from "@iconify/icons-fluent/picture-in-picture-enter-20-regular";
import info from "@iconify/icons-fluent/error-circle-20-regular";
import subtract from "@iconify/icons-fluent/subtract-circle-20-regular";
import dismiss from "@iconify/icons-fluent/dismiss-20-regular";
import reset from "@iconify/icons-fluent/arrow-reset-20-regular";

export const iconPacks = {
  reset,
  dismiss,
  subtract,
  info,
  check,
  pip,
  fullscreenOn,
  fullscreenOff,
  movie,
  tv,
  tag,
  link,
  add,
  rate,
  list,
  arrow,
  playFill,
  play,
  next,
  search,
  empty,
  loading,
  video,
  film,
  filmFill,
  remove,
  brightness,
  volume1,
  volume2,
  volumeOff,
  detail,
  offline,
  history,
  close,
  enter,
  more,
  home,
  category,
  setting,
  source,
  update,
  bug,
  globe,
  about,
};

export type IconName = keyof typeof iconPacks;
