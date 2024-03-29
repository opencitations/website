# -*- coding: utf-8 -*-
# Copyright (c) 2016, Silvio Peroni <essepuntato@gmail.com>
#
# Permission to use, copy, modify, and/or distribute this software for any purpose
# with or without fee is hereby granted, provided that the above copyright notice
# and this permission notice appear in all copies.
#
# THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
# REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
# FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT,
# OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE,
# DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS
# ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS
# SOFTWARE.

__author__ = 'essepuntato'
import logging
import web
from datetime import datetime
from os import sep, path, makedirs

class WebLogger(object):
    def __init__(self, name, log_dir, list_of_web_var=[], filter_request={}):
        self.l = logging.getLogger(name)
        self.vars = list_of_web_var
        self.filter = filter_request

        # Configure logger
        self.l.setLevel(logging.INFO)

        self.log_dir = log_dir
        self.month = None

        # Add a file handler if it is not set yet
        self.__set_file_handler()

    def __set_file_handler(self):
        cur_month = datetime.now().strftime('%Y-%m')
        if self.month != cur_month:
            for fh in self.l.handlers:
                if isinstance(fh, logging.FileHandler):
                    self.l.removeHandler(fh)

            self.month = cur_month
            file_path = self.log_dir + sep + "oc-" + self.month + ".txt"
            if not path.exists(file_path):
                file_dir = path.dirname(file_path)
                if not path.exists(file_dir):
                    makedirs(file_dir)
                open(file_path, "a").close()

            file_handler = logging.FileHandler(file_path)
            log_formatter = logging.Formatter('%(asctime)s %(message)s')
            file_handler.setFormatter(log_formatter)
            file_handler.setLevel(logging.INFO)
            self.l.addHandler(file_handler)

    def mes(self):
        cur_message = ""
        must_be_filtered = False
        for var in self.vars:
            cur_value = str(web.ctx.env.get(var))
            if var in self.filter and cur_value in self.filter[var]:
                must_be_filtered = True
            cur_message += "# %s: %s " % (var, cur_value)
        if not must_be_filtered:
            # Use the correct file handler
            self.__set_file_handler()
            self.l.info(cur_message)

