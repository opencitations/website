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
from SPARQLWrapper import SPARQLWrapper, JSON
from urllib.parse import quote
from datetime import datetime
from src.citation import Citation
from urllib.parse import quote
from csv import DictReader


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
        self.f = {
            "doi_decode": self.__doi_decode,
            "encode": quote
        }

        self.lookup = {}
        if "lookup" in self.conf:
            with open(self.conf["lookup"]) as f:
                reader = DictReader(f)
                for row in reader:
                    self.lookup[row["code"]] = row["c"]


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

    def __execute_query(self, citing_entity, cited_entity):
        result = None

        try:
            i = iter(self.conf["ci"])
            while result is None:
                item = next(i)
                query, prefix, tp, use_it, preprocess = item["query"], item["prefix"], item["tp"], item["use_it"], \
                                                        item["preprocess"] if "preprocess" in item else []

                citing = citing_entity
                cited = cited_entity

                if use_it == "yes" and citing.startswith(prefix) and cited.startswith(prefix):
                    citing = re.sub("^" + prefix, "", citing)
                    cited = re.sub("^" + prefix, "", cited)

                    for f_name in preprocess:
                        citing = self.f[f_name](citing)
                        cited = self.f[f_name](cited)

                    sparql = SPARQLWrapper(tp)
                    sparql_query = re.sub("\\[\\[CITED\\]\\]", cited,
                                          re.sub("\\[\\[CITING\\]\\]", citing, query))

                    sparql.setQuery(sparql_query)
                    sparql.setReturnFormat(JSON)
                    q_res = sparql.query().convert()["results"]["bindings"]
                    if len(q_res) > 0:
                        answer = q_res[0]
                        result = answer["citing"]["value"], answer["cited"]["value"], \
                                 answer["citing_date"]["value"] if "citing_date" in answer else None, \
                                 answer["cited_date"]["value"] if "cited_date" in answer else None, \
                                 answer["creation"]["value"] if "creation" in answer else None, \
                                 answer["timespan"]["value"] if "timespan" in answer else None, \
                                 tp + "?query=" + quote(sparql_query)

        except StopIteration:
            pass  # No nothing

        return result

    def __handle_citation(self, url, ex_regex):
        citing_entity_local_id = re.sub("^ci/%s%s$" % (self.__citation_local_url_re, ex_regex), "\\1", url)
        cited_entity_local_id = re.sub("^ci/%s%s$" % (self.__citation_local_url_re, ex_regex), "\\6", url)

        res = self.__execute_query(citing_entity_local_id, cited_entity_local_id)
        if res is not None:
            citing_url, cited_url, full_citing_pub_date, full_cited_pub_date, creation, timespan, sparql_query_url = res

            citation = Citation(citing_entity_local_id, citing_url, full_citing_pub_date,
                                cited_entity_local_id, cited_url, full_cited_pub_date,
                                creation, timespan,
                                self.virtual_entity_director, sparql_query_url,
                                datetime.now().strftime('%Y-%m-%dT%H:%M:%S'))

            return self.ldd.get_representation(url, True, citation.get_citation_rdf(self.virtual_baseurl, False))

    def __handle_identifier(self, url, ex_regex):
        identified_entity_corpus_id = re.sub("^id/%s%s$" % (self.__identifier_local_url_re, ex_regex), "\\1/\\2-\\7",
                                             url)
        identified_entity_rdf = self.get_representation(identified_entity_corpus_id + ".rdf")
        if identified_entity_rdf is not None:
            citing_entity_local_id, cited_entity_local_id = identified_entity_corpus_id[3:].split("-")
            identifier = Citation(citing_entity_local_id, None, None,
                                  cited_entity_local_id, None, None,
                                  None, None,
                                  self.virtual_entity_director,
                                  self.virtual_baseurl + identified_entity_corpus_id,
                                  datetime.now().strftime('%Y-%m-%dT%H:%M:%S'))
            return self.ldd.get_representation(url, True, identifier.get_oci_rdf(self.virtual_baseurl))

    def __doi_decode(self, s):
        result = []

        for code in re.findall("(9*[0-8][0-9])", s):
            if code in self.lookup:
                result.append(self.lookup[code])
            else:
                result.append(code)

        return "10." + "".join(result)