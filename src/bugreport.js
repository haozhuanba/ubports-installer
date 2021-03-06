/*
 * Copyright (C) 2020 UBports Foundation <info@ubports.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const axios = require("axios");
const util = require("util");
const { osInfo } = require("systeminformation");

const FormData = require("form-data");

function getDeviceString() {
  try {
    return global.installProperties.device
      ? `%60${global.installProperties.device}%60`
      : "Not detected";
  } catch (e) {
    return "unknown";
  }
}

function getTargetOsString() {
  try {
    return !util.isUndefined(global.installProperties.osIndex)
      ? global.installConfig.operating_systems[global.installProperties.osIndex]
          .name
      : "Not yet set";
  } catch (e) {
    return "unknown";
  }
}

function getSettingsString() {
  try {
    `%60${JSON.stringify(global.installProperties.settings || {})}%60`;
  } catch (e) {
    return "unknown";
  }
}

function getPackageString() {
  try {
    return `%60${
      process.env.SNAP_NAME ? "snap" : global.packageInfo.package || "source"
    }%60`;
  } catch (e) {
    return "unknown";
  }
}

function getOsString(hostOs) {
  return [
    hostOs.distro,
    hostOs.release,
    hostOs.codename,
    hostOs.platform,
    hostOs.kernel,
    hostOs.arch,
    hostOs.build,
    hostOs.servicepack
  ]
    .filter(i => i)
    .join(" ");
}

const getDebugInfo = (reason, logurl, hostOs) =>
  `UBports Installer: %60${global.packageInfo.version}%60 %0D%0A
Device: ${getDeviceString()} %0D%0A
OS to install: ${getTargetOsString()} %0D%0A
Settings: ${getSettingsString()} %0D%0A
Package: ${getPackageString()} %0D%0A
Operating System: ${getOsString(hostOs)} %0D%0A
NodeJS version: %60${process.version}%60 %0D%0A
Error log: ${logurl} %0D%0A
%60%60%60 %0D%0A
${reason} %0D%0A
%60%60%60 %0D%0A%0D%0A
<!-- please add any info that might be useful to reproduce this issue -->`;

function createBugReport(title, callback) {
  var options = {
    limit: 400,
    start: 0,
    order: "desc"
  };

  global.logger.query(options, function(err, results) {
    if (err) {
      throw err;
    }

    var errorLog = "";
    results.file.forEach(err => {
      errorLog += err.level + ": ";
      errorLog += err.message + "\n";
    });

    const form = new FormData();
    form.append("poster", "UBports Installer");
    form.append("syntax", "text");
    form.append("expiration", "year");
    form.append("content", `Title: ${title}\n\n${errorLog}`);

    axios
      .post("http://paste.ubuntu.com", form, { headers: form.getHeaders() })
      .then(r => `https://paste.ubuntu.com/${r.request.path}`)
      .then(logurl =>
        osInfo(hostOs => callback(getDebugInfo(title, logurl, hostOs)))
      )
      .catch(() => callback(false));
  });
}

module.exports = {
  createBugReport
};
