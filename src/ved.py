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

import re
import web
from src.oci import OCIManager


class VirtualEntityDirector(object):
    __extensions = (".rdf", ".ttl", ".json", ".html")
    __html = ("text/html",)
    __rdfxml = ("application/rdf+xml",)
    __turtle = ("text/turtle", "text/n3")
    __jsonld = ("application/ld+json", "application/json")

    __oci_shape = "((0[1-9]+0)[0-9]+)|(([1-9])[0-9]*)"
    __citation_local_url_re = "(%s)-(%s)" % (__oci_shape, __oci_shape)
    __identifier_local_url_re = "([a-z][a-z])-" + __citation_local_url_re

    def __init__(self, ldd, virtual_local_url, conf):
        self.ldd = ldd
        self.virtual_local_url = virtual_local_url
        self.virtual_baseurl = self.ldd.baseurl.replace(self.ldd.corpus_local_url, self.virtual_local_url)
        self.conf = conf
        self.virtual_entity_director = self.ldd.baseurl + "prov/pa/7"

    def redirect(self, url):
        if url.endswith(self.__extensions):
            return self.get_representation(url)
        else:
            content_type = web.ctx.env.get("HTTP_ACCEPT")
            if content_type:
                for accept_block in content_type.split(";")[::2]:
                    accept_types = accept_block.split(",")

                    if any(mime in accept_types for mime in self.__rdfxml):
                        raise web.seeother(self.virtual_local_url + url + ".rdf")
                    elif any(mime in accept_types for mime in self.__turtle):
                        raise web.seeother(self.virtual_local_url + url + ".ttl")
                    elif any(mime in accept_types for mime in self.__jsonld):
                        raise web.seeother(self.virtual_local_url + url + ".json")
                    else:  # HTML
                        raise web.seeother(self.virtual_local_url + url + ".html")

    def get_representation(self, url):
        if len(url) > 3:  # which means there is a local id specified
            ex_regex = "(\\%s)" % "|\\".join(self.__extensions)
            # dealing citations
            if re.match("^ci/%s%s$" % (self.__citation_local_url_re, ex_regex), url) is not None:
                return self.__handle_citation(url, ex_regex)
            # dealing virtual identifiers
            elif re.match("^id/%s%s$" % (self.__identifier_local_url_re, ex_regex), url) is not None:
                return self.__handle_identifier(url, ex_regex)

    def __handle_citation(self, url, ex_regex):
        oci = "oci:%s" % re.sub("^ci/(.+)%s$" % ex_regex, "\\1", url).split(".")[0]
        print(oci, self.conf["lookup"], self.conf["oci_conf"])
        om = OCIManager(oci, self.conf["lookup"], self.conf["oci_conf"])
        citation_g = om.get_citation_object().get_citation_rdf(self.virtual_baseurl, False)
        if citation_g:
            return self.ldd.get_representation(url, True, citation_g)

    def __handle_identifier(self, url, ex_regex):
        identified_entity_corpus_id = re.sub("^id/%s%s$" % (self.__identifier_local_url_re, ex_regex), "\\1/\\2-\\7",
                                             url)
        oci = "oci:%s" % re.sub("^ci/(.+)$", "\\1", identified_entity_corpus_id)
        om = OCIManager(oci, self.conf["lookup"], self.conf["oci_conf"])
        oci_g = om.get_citation_object().get_oci_rdf(self.virtual_baseurl)
        if oci_g:
            return self.ldd.get_representation(url, True, oci_g)
