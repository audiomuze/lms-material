/**
 * LMS-Material
 *
 * Copyright (c) 2018-2023 Craig Drummond <craig.p.drummond@gmail.com>
 * MIT license.
 */
'use strict';

const DEFAULT_COVER = "music/0/cover";

function shadeRgb(rgb, percent) {
    var t = percent <0 ? 0 : 255,
        p = percent < 0 ? percent*-1 : percent;
    return [Math.round((t-rgb[0])*p)+rgb[0], Math.round((t-rgb[1])*p)+rgb[1], Math.round((t-rgb[2])*p)+rgb[2]];
}

function rgbBrightness(rgb) {
    return (((rgb[0]*299)+(rgb[1]*587)+(rgb[2]*114))/1000);
}

function rgb2Hex(rgb) {
    let hex="#";
    for (let i=0; i<3; ++i) {
        let hv = rgb[i].toString(16);
        hex += (hv.length==1 ? "0" : "") + hv;
    }
    return hex;
}

var lmsCurrentCover = Vue.component('lms-currentcover', {
    template: `<div/>`,
    data() {
        return {
        };
    },
    mounted: function() {
        this.coverUrl = LMS_BLANK_COVER;
        this.fac = new FastAverageColor();
        this.facOptions = {
            ignoredColor: [ [255, 255, 255, 255], [0, 0, 0, 255] ]
        }
        bus.$on('playerStatus', function(playerStatus) {
            // Has cover changed?
            var coverUrl = this.coverUrl;

            if (playerStatus.playlist.count == 0) {
                this.queueIndex = undefined;
                if (undefined===this.coverFromInfo || this.coverFromInfo || undefined==this.cover) {
                    coverUrl=resolveImageUrl(DEFAULT_COVER, LMS_CURRENT_IMAGE_SIZE);
                    this.coverFromInfo = false;
                }
            } else {
                this.queueIndex = playerStatus.current["playlist index"];
                coverUrl = undefined;
                if (playerStatus.current.artwork_url) {
                    coverUrl=resolveImageUrl(playerStatus.current.artwork_url, LMS_CURRENT_IMAGE_SIZE);
                }
                if (undefined==coverUrl && undefined!=playerStatus.current.coverid) { // && !(""+playerStatus.current.coverid).startsWith("-")) {
                    coverUrl="/music/"+playerStatus.current.coverid+"/cover"+LMS_CURRENT_IMAGE_SIZE;
                }
                if (undefined==coverUrl && this.$store.state.infoPlugin) {
                    if (playerStatus.current.artist_ids) {
                        coverUrl="/imageproxy/mai/artist/" + playerStatus.current.artist_ids[0] + "/image" + LMS_CURRENT_IMAGE_SIZE;
                    } else if (playerStatus.current.artist_id) {
                        coverUrl="/imageproxy/mai/artist/" + playerStatus.current.artist_id + "/image" + LMS_CURRENT_IMAGE_SIZE;
                    }
                }
                if (undefined==coverUrl) {
                    // Use players current cover as cover image. Need to add extra (coverid, etc) params so that
                    // the URL is different between tracks...
                    coverUrl="/music/current/cover.jpg?player=" + this.$store.state.player.id;
                    if (playerStatus.current.album_id) {
                        coverUrl+="&album_id="+playerStatus.current.album_id;
                    } else {
                        if (playerStatus.current.album) {
                            coverUrl+="&album="+encodeURIComponent(playerStatus.current.album);
                        }
                        if (playerStatus.current.albumartist) {
                            coverUrl+="&artist="+encodeURIComponent(playerStatus.current.albumartist);
                        }
                        if (playerStatus.current.year && playerStatus.current.year>0) {
                            coverUrl+="&year="+playerStatus.current.year;
                        }
                    }
                    coverUrl=resolveImageUrl(coverUrl, LMS_CURRENT_IMAGE_SIZE);
                }
                this.coverFromInfo = true;
            }

            if (coverUrl!=this.coverUrl) {
                this.coverUrl = coverUrl;
                bus.$emit('currentCover', this.coverUrl, this.queueIndex);
                if (1==queryParams.nativeCover) {
                    try {
                        NativeReceiver.coverUrl(this.coverUrl);
                    } catch (e) {
                    }
                } else if (2==queryParams.nativeCover) {
                    console.log("MATERIAL-COVER\nURL " + this.coverUrl);
                }

                if (this.$store.state.color==COLOR_FROM_COVER) {
                    this.fac.getColorAsync(this.coverUrl, this.facOptions).then(color => {
                        let rgbs = color.rgb.replace('rgb(', '').replace(')', '').split(',');
                        let rgb = [parseInt(rgbs[0]), parseInt(rgbs[1]), parseInt(rgbs[2])];
                        let rgba = [rgb[0], rgb[1], rgb[2]];

                        if (color.isLight) {
                            while (rgbBrightness(rgb)>170) {
                                rgb = shadeRgb(rgb, -0.1);
                            }
                            rgba = [rgb[0], rgb[1], rgb[2]];
                        } else {
                            while (rgbBrightness(rgb)<50) {
                                rgb = shadeRgb(rgb, 0.1);
                            }
                            rgba = [rgb[0], rgb[1], rgb[2]];
                            while (rgbBrightness(rgba)<90) {
                                rgba = shadeRgb(rgba, 0.1);
                            }
                        }
                        document.documentElement.style.setProperty('--primary-color', rgb2Hex(rgb));
                        while (rgbBrightness(rgb)<150) {
                            rgb = shadeRgb(rgb, 0.1);
                        }
                        document.documentElement.style.setProperty('--accent-color', rgb2Hex(rgb));
                        let rgbas = "rgba("+rgba[0]+","+rgba[1]+","+rgba[2];
                        document.documentElement.style.setProperty('--pq-current-color', rgbas+",0.2)");
                        document.documentElement.style.setProperty('--drop-target-color', rgbas+",0.5)");
                    }).catch(e => {
                    });
                }
            }
        }.bind(this));

        bus.$on('getCurrentCover', function() {
            bus.$emit('currentCover', this.coverUrl, this.queueIndex);
        }.bind(this));
    }
});

