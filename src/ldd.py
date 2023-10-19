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

from xml.sax import SAXParseException
import web
import rdflib
import os
import shutil
import re
import urllib
from rdflib import RDFS, ConjunctiveGraph, Graph, Literal, URIRef
import json
from rdflib.plugin import register, Serializer
import requests

# register jsonld
register('json-ld', Serializer, 'rdflib_jsonld.serializer', 'JsonLDSerializer')


class LinkedDataDirector(object):
    __extensions = (".rdf", ".ttl", ".json", ".html")
    __html = ("text/html",)
    __rdfxml = ("application/rdf+xml",)
    __turtle = ("text/turtle", "text/n3")
    __jsonld = ("application/ld+json", "application/json")
    __rdfs_label = "http://www.w3.org/2000/01/rdf-schema#label"
    __rdfs_comment = "http://www.w3.org/2000/01/rdf-schema#comment"
    __rdf_type = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
    __entityiri = "__entityiri"

    def __init__(self, file_basepath, template_path, baseurl, jsonld_context_path,
                 corpus_local_url, label_conf=None, tmp_dir=None,
                 dir_split_number=0, file_split_number=0, default_dir="_", from_triplestore=None, label_func=None):
        self.dir_split_number = dir_split_number
        self.file_split_number = file_split_number
        self.default_dir = default_dir
        self.basepath = file_basepath
        self.baseurl = baseurl + corpus_local_url
        self.corpus_local_url = corpus_local_url
        self.label_func = label_func
        self.tp = None
        if from_triplestore is not None:
            #self.tp = ConjunctiveGraph('SPARQLStore')
            #self.tp.open(from_triplestore)
            self.tp = from_triplestore

        with open(jsonld_context_path) as f:
            self.jsonld_context = json.load(f)["@context"]

        self.tmp_dir = tmp_dir
        self.render = web.template.render(template_path)
        self.label_conf = self.__generate_from_context()
        if label_conf is not None:
            self.label_conf.update(label_conf)

        self.label_iri = self.__generate_from_label_conf()

        if self.__rdfs_label not in self.label_conf:
            self.label_conf[self.__rdfs_label] = "label"
        if self.__rdfs_comment not in self.label_conf:
            self.label_conf[self.__rdfs_comment] = "comment"
        if self.__rdf_type not in self.label_conf:
            self.label_conf[self.__rdf_type] = "type"

    def __generate_from_label_conf(self):
        result = {}

        for key in self.label_conf:
            result[self.label_conf[key]] = key

        return result

    def __generate_from_context(self):
        result = {}

        http_items = {}
        for key in self.jsonld_context:
            value = self.jsonld_context[key]
            if isinstance(value, dict):
                value = value["@id"]
            if value.startswith("http"):
                http_items[key] = value
                result[value] = key.replace("_", " ")

        for key in self.jsonld_context:
            value = self.jsonld_context[key]
            if isinstance(value, dict):
                value = value["@id"]
            if not value.startswith("http"):
                while True:
                    split_value = value.split(":", 1)
                    if len(split_value) > 1:
                        pref = split_value[0]
                        if pref in http_items.keys():
                            value = value.replace(pref + ":", http_items[pref])
                        else:
                            break
                    else:
                        break
                result[value] = key.replace("_", " ")

        return result

    def log(self):
        if self.logger is not None:
            self.logger.mes()

    def get_render(self):
        return self.render

    def serialise(self, cur_graph, format):
        final_graph = rdflib.Graph()

        for ns in cur_graph.namespaces():
            final_graph.namespace_manager.bind(ns[0], ns[1])

        for s, p, o in cur_graph.triples((None, None, None)):
            s_str = str(s)
            if s_str.startswith("file://"):
                s_str = ""
            final_graph.add((rdflib.URIRef(s_str), p, o))
        return final_graph.serialize(format=format)

    def redirect(self, url):
        if url is None:
            raise web.seeother(self.corpus_local_url + "index")
        elif url.endswith(self.__extensions):
            cur_extension = "." + url.split(".")[-1]
            no_extension = url.replace(cur_extension, "")
            if no_extension == "" or no_extension.endswith("/"):
                return self.get_representation(no_extension + "index" + cur_extension)
            else:
                is_resource = "index" not in url
                return self.get_representation(url, is_resource)
        elif url.endswith("/prov/"):
            pass  # TODO: it must be handled somehow
        else:
            content_type = web.ctx.env.get("HTTP_ACCEPT")
            if content_type:
                for accept_block in content_type.split(";")[::2]:
                    accept_types = accept_block.split(",")

                    if url.endswith("/"):
                        cur_url = url + "index"
                    else:
                        cur_url = url

                    resource_url = self.corpus_local_url + cur_url

                    if any(mime in accept_types for mime in self.__rdfxml):
                        raise web.seeother(resource_url + ".rdf")
                    elif any(mime in accept_types for mime in self.__turtle):
                        raise web.seeother(resource_url + ".ttl")
                    elif any(mime in accept_types for mime in self.__jsonld):
                        raise web.seeother(resource_url + ".json")
                    else:  # HTML
                        raise web.seeother(resource_url + ".html")

    @staticmethod
    def __add_license(g):
        g.add((
            rdflib.URIRef(""),
            rdflib.URIRef("http://purl.org/dc/terms/license"),
            rdflib.URIRef("https://creativecommons.org/publicdomain/zero/1.0/legalcode")))

    def get_representation(self, url, is_resource=False, cur_graph=None):
        if cur_graph is None:
            if self.tp is None:
                local_file = ".".join(url.split(".")[:-1])
                subj_iri = (self.baseurl + local_file).replace("/index", "/")

                if "/" in local_file:
                    slash_split = local_file.split("/")
                    cur_dir = "/".join(slash_split[:-1])
                    cur_name = slash_split[-1]
                else:
                    cur_dir = "."
                    cur_name = local_file

                if is_resource and self.dir_split_number and self.file_split_number:
                    is_prov = "/prov/" in cur_dir
                    prov_regex = "(.+/)([0-9]+)(/prov/[^/]+).*$"
                    if is_prov:
                        cur_number_s = re.sub(prov_regex, "\\2", cur_dir)
                    else:
                        cur_number_s = cur_name

                    if cur_number_s.startswith("0"):
                        cur_number = int(re.sub("^0[1-9]+0(.+)$", "\\1", cur_number_s))
                        main_dir = re.sub("^(0[1-9]+0).+$", "\\1", cur_number_s)
                    else:
                        cur_number = int(cur_number_s)
                        main_dir = self.default_dir

                    # Find the correct directory number where to save the file
                    cur_split = 0
                    while True:
                        if cur_number > cur_split:
                            cur_split += self.dir_split_number
                        else:
                            break

                    # Find the correct file number where to save the resources
                    cur_file_split = 0
                    while True:
                        if cur_number > cur_file_split:
                            cur_file_split += self.file_split_number
                        else:
                            break

                    if is_prov:
                        cur_file_path = self.basepath + os.sep + \
                                       re.sub(prov_regex, "\\1", cur_dir) + \
                                       main_dir + os.sep + \
                                       str(cur_split) + os.sep + \
                                       str(cur_file_split) + os.sep + \
                                       re.sub(prov_regex, "\\3", cur_dir)
                    elif cur_dir.startswith("prov"):
                        cur_full_dir = self.basepath + os.sep + cur_dir
                        cur_file_path = cur_full_dir + os.sep + str(cur_name)
                    else:
                        cur_full_dir = self.basepath + os.sep + cur_dir + os.sep + main_dir + os.sep + str(cur_split)
                        cur_file_path = cur_full_dir + os.sep + str(cur_file_split)
                else:
                    cur_full_dir = self.basepath + os.sep + cur_dir
                    cur_file_path = cur_full_dir + os.sep + "index"

                cur_file_path += ".json"

                if os.path.exists(cur_file_path):
                    cur_graph = self.load_graph(cur_file_path, subj_iri, self.tmp_dir)
            else:
                try:
                    resource_url = self.baseurl + url.rsplit(".", 1)[0]
                    if resource_url.endswith("/index"):
                        resource_url = resource_url[:-5]
                    #res = self.tp.query("CONSTRUCT {?s ?p ?o} "
                    #                    "WHERE { <%s> ?p ?o . BIND(<%s> as ?s) }" %
                    #                    (resource_url, resource_url))
                    _a_source_t = ""
                    for _a_source in ["index/coci/","index/doci/","index/poci/","index/oroci/","index/croci/"]:
                        if _a_source in resource_url:
                            resource_url = resource_url.replace(_a_source,"index/")
                            _a_source_t = "?s <http://www.w3.org/ns/prov#atLocation> <https://w3id.org/oc/"+_a_source+"> ."

                    sparql_query = "CONSTRUCT {?s ?p ?o} WHERE { <"+resource_url+"> ?p ?o . BIND (<"+resource_url+"> as ?s) . "+_a_source_t+"}"
                    res = requests.get(self.tp, params={"query": sparql_query}, headers={"Accept":"text/turtle"})

                    if res.status_code == 200:
                        turtle_data = res.text
                        cur_graph = Graph()
                        cur_graph.parse(data=turtle_data, format="turtle")

                        if self.label_func is not None:
                            cur_graph.add((URIRef(resource_url), RDFS.label,
                                           Literal(self.label_func(resource_url))))
                except TypeError as e:
                    print("The function used for adding the label is not working correctly: %s" % e)
                except Exception:
                    pass  # The query didn't return anything

        if cur_graph is not None and len(cur_graph):
            if url.endswith(".rdf"):
                LinkedDataDirector.__add_license(cur_graph)
                web.header('Content-Type', self.__rdfxml[0])
                return self.serialise(cur_graph, "xml")
            elif url.endswith(".ttl"):
                LinkedDataDirector.__add_license(cur_graph)
                web.header('Content-Type', self.__turtle[0])
                return self.serialise(cur_graph, "turtle")
            elif url.endswith(".json"):
                LinkedDataDirector.__add_license(cur_graph)
                web.header('Content-Type', self.__jsonld[0])
                return self.serialise(cur_graph, "json-ld")
            elif url.endswith(".html"):
                # {
                #   "__entityiri": "http://..." ,
                #   "label": ["donald", "duck"] ,
                #   "type": [
                #       { "__entityiri": "http://...", "label": ["daisy", "duck"] } , ...]
                # }
                cur_data = {}
                for s, p, o in cur_graph.triples((None, None, None)):
                    str_s = str(s)
                    # If the starting URL is not a "current document entity" proceed
                    if not str_s.startswith("file://"):
                        cur_data[self.__entityiri] = str_s

                        str_p = str(p)
                        if str_p in self.label_conf:
                            str_p = self.label_conf[str_p]

                            str_o = str(o)
                            label_o = None
                            if str_o in self.label_conf:
                                label_o = self.label_conf[str_o]

                            if str_p not in cur_data:
                                cur_data[str_p] = []

                            has_label = False
                            if isinstance(o, rdflib.URIRef):
                                cur_entity = {self.__entityiri: str_o}
                                if str_o.startswith(self.baseurl):

                                # The following 'if' is for internal testing
                                # (comment the above one if needed)
                                # if str_o.startswith(
                                #   "http://www.sparontologies.net/mediatype/"):
                                    try:
                                        # The following two lines are for internal testing
                                        # (comment the above one if needed)
                                        external_graph = self.load_graph(
                                            self.basepath + os.sep +
                                            urllib.unquote_plus(
                                                str_o.replace(self.baseurl, "")) +
                                            # The following line is for internal testing
                                            # (comment the above one if needed)
                                                # str_o.replace(
                                                #     "http://www.sparontologies.net/mediatype/", "")) +
                                            ".rdf", subj_iri, self.tmp_dir)
                                        is_first = True
                                        for s2, p2, o2 in \
                                                external_graph.triples((o, RDFS.label, None)):
                                            has_label = True
                                            if is_first:
                                                 cur_entity[
                                                     self.label_conf[self.__rdfs_label]] = []
                                            cur_entity[
                                                self.label_conf[self.__rdfs_label]] += [str(o2)]
                                    except Exception as e:
                                        pass  # do not add anything

                                if not has_label and label_o is not None:
                                    cur_entity[self.label_conf[self.__rdfs_label]] = [label_o]

                                cur_data[str_p] += [cur_entity]
                            else:
                                cur_data[str_p] += [str_o]

                            if "__entityiri" in cur_data[str_p][0]:
                                cur_data[str_p] = sorted(cur_data[str_p], key=lambda k: k['__entityiri'])
                web.header('Content-Type', self.__html[0])
                return self.render.ldd(cur_data, sorted(cur_data.keys()), self.label_iri)

    @staticmethod
    def hack_dates():
        if rdflib.XSD.gYear in rdflib.term._toPythonMapping:
            rdflib.term._toPythonMapping.pop(rdflib.XSD.gYear)
        if rdflib.XSD.gYearMonth in rdflib.term._toPythonMapping:
            rdflib.term._toPythonMapping.pop(rdflib.XSD.gYearMonth)

    def load_graph(self, file_path, subj_iri, temp_dir_for_rdf_loading=None):
        LinkedDataDirector.hack_dates()
        # The line above has been added for handling gYear and gYearMonth correctly.
        # More info at https://github.com/RDFLib/rdflib/issues/806.

        current_graph = None

        if re.match("https?://", file_path) or os.path.isfile(file_path):
            try:
                current_graph = self.__load_graph(file_path)
            except IOError:
                if temp_dir_for_rdf_loading is not None:
                    current_file_path = temp_dir_for_rdf_loading + os.sep + "tmp_rdf_file.rdf"
                    shutil.copyfile(file_path, current_file_path)
                    try:
                        current_graph = LinkedDataDirector.__load_graph(current_file_path)
                        os.remove(current_file_path)
                    except Exception as e:
                        os.remove(current_file_path)
                        raise e
        else:
            raise IOError("1", "The file specified doesn't exist.")

        if current_graph is not None:
            subj_graph = rdflib.Graph()
            for s, p, o in current_graph.triples((rdflib.URIRef(subj_iri), None, None)):
                subj_graph.add((s, p, o))
            current_graph = subj_graph

        return current_graph

    def __load_graph(self, file_path):
        current_graph = None

        with open(file_path) as f:
            json_ld_file = json.load(f)
            # Trick to force the use of a pre-loaded context
            json_ld_file["@context"] = self.jsonld_context

            current_graph = rdflib.ConjunctiveGraph()

            current_graph.parse(data=json.dumps(json_ld_file, ensure_ascii=False), format="json-ld")

        return current_graph
