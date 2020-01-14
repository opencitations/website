#!/usr/bin/python
# -*- coding: utf-8 -*-
# Copyright (c) 2019, Silvio Peroni <essepuntato@gmail.com>
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

from argparse import ArgumentParser
from collections import deque
from csv import DictReader
from csv import DictWriter
from datetime import datetime
from io import StringIO
from json import dumps, load, loads, JSONDecodeError
from os.path import exists, dirname
from os import makedirs
from errno import EEXIST
from re import match, findall, sub
from urllib.parse import quote, unquote
from xml.etree import ElementTree
from SPARQLWrapper import SPARQLWrapper, JSON
from dateutil.parser import parse
from dateutil.relativedelta import relativedelta
from rdflib import Graph, ConjunctiveGraph, RDF, RDFS, XSD, URIRef, Literal, Namespace
from requests import get
from requests.exceptions import Timeout

REFERENCE_CITATION_TYPE = "reference"
SUPPLEMENT_CITATION_TYPE = "supplement"
DEFAULT_CITATION_TYPE = REFERENCE_CITATION_TYPE
CITATION_TYPES = (REFERENCE_CITATION_TYPE, SUPPLEMENT_CITATION_TYPE)
DEFAULT_DATE = datetime(1970, 1, 1, 0, 0)
AGENT_NAME = "OpenCitations"
USER_AGENT = "InTRePID / %s (via OpenCitations - http://opencitations.net; " \
             "mailto:contact@opencitations.net)" % AGENT_NAME
URL = "https://github.com/opencitations/intrepid/blob/master/oci.py"
BASE_URL = "https://w3id.org/oc/virtual/"
W = "WARNING"
E = "ERROR"
I = "INFO"
PREFIX_REGEX = "0[1-9]+0"
VALIDATION_REGEX = "^%s[0-9]+$" % PREFIX_REGEX
INTREPID_VALIDATION_REGEX = "^intrepid:[0-9]+-[0-9]+/[0-9]+-[0-9]+$"
FORMATS = {
    "xml": "xml",
    "rdfxml": "xml",
    "rdf/xml": "xml",
    "application/rdf+xml": "xml",
    "turtle": "turtle",
    "ttl": "turtle",
    "rdf": "turtle",
    "text/turtle": "turtle",
    "json": "json",
    "scholix": "scholix",
    "application/json": "json",
    "json-ld": "json-ld",
    "jsonld": "json-ld",
    "application/ld+json": "json-ld",
    "n-triples": "nt11",
    "ntriples": "nt11",
    "nt": "nt11",
    "nq": "nquads",
    "text/plain": "nt11",
    "text/n-triples": "nt11",
    "csv": "csv",
    "text/csv": "csv"
}


class InTRePIDManager(object):
    def __init__(self, intrepid_string=None, lookup_file=None, conf_file=None):
        self.is_valid = None
        self.messages = []
        self.f = {
            "decode": self.__decode,
            "encode": quote,
            "join": InTRePIDManager.__join,
            "shape": InTRePIDManager.__shape,
            "remove": InTRePIDManager.__remove,
            "normdate": InTRePIDManager.__normdate,
            "datestrings": InTRePIDManager.__datestrings,
            "avoid_prefix_removal": InTRePIDManager.__avoid_prefix_removal
        }
        self.lookup = {}
        self.inverse_lookup = {}
        self.lookup_file = lookup_file
        self.lookup_code = -1
        if self.lookup_file is not None:
            if exists(self.lookup_file):
                with open(self.lookup_file, 'r') as f:
                    lookupcsv_reader = DictReader(f)
                    code = -1
                    for row in lookupcsv_reader:
                        self.lookup[row["code"]] = row["c"]
                        self.inverse_lookup[row["c"]] = row["code"]
                        code = int(row['code'])
                    self.lookup_code = code
            else:
                with open(self.lookup_file, 'w') as f:
                    f.write('"c","code"')
        else:
            self.add_message("__init__", W, "No lookup file has been found (path: '%s')." % lookup_file)
        self.conf = None
        if conf_file is not None and exists(conf_file):
            with open(conf_file) as f:
                self.conf = load(f)
        else:
            self.add_message("__init__", W, "No configuration file has been found (path: '%s')." % conf_file)

        if intrepid_string:
            self.intrepid = intrepid_string.lower().strip()
        else:
            self.intrepid = None
            self.add_message("__init__", W, "No InTRePID specified!")

    def __match_str_to_lookup(self, str_val):
        ci_str = []
        for c in str_val:
            if c not in self.inverse_lookup:
                self.__update_lookup(c)
            ci_str.append(str(self.inverse_lookup[c]))
        return "".join(ci_str)

    def __update_lookup(self, c):
        if c not in self.inverse_lookup:
            self.__calc_next_lookup_code()
            code = str(self.lookup_code)
            if len(code) == 1:
                code = "0" + code
            self.inverse_lookup[c] = code
            self.lookup[code] = c
            self.__write_txtblock_on_csv(self.lookup_file, '\n"%s","%s"' % (c, code))

    def __write_txtblock_on_csv(self, csv_path, block_txt):
        if csv_path is not None and exists(csv_path):
            self.__check_make_dirs(csv_path)
            with open(csv_path, 'a', newline='') as csvfile:
                csvfile.write(block_txt)

    def __calc_next_lookup_code(self):
        rem = self.lookup_code % 100
        newcode = self.lookup_code + 1
        if rem == 89:
            newcode = newcode * 10
        self.lookup_code = newcode

    def __check_make_dirs(self, filename) :
        if not exists(dirname(filename)):
            try:
                makedirs(dirname(filename))
            except OSError as exc:
                if exc.errno != EEXIST:
                    raise

    def __decode(self, s):
        result = []

        for code in findall("(9*[0-8][0-9])", s):
            if code in self.lookup:
                result.append(self.lookup[code])
            else:
                result.append(code)

        return "10." + "".join(result)

    def __decode_inverse(self, doi):
        return self.__match_str_to_lookup(doi.replace("10.", ""))

    @staticmethod
    def __join(l, j_value=""):
        if type(l) is list:
            return j_value.join(l)
        else:
            return l

    @staticmethod
    def __avoid_prefix_removal(s):
        return "0123567890" + s

    @staticmethod
    def __shape(id_s, base=""):
        return base + quote(id_s)

    @staticmethod
    def __remove(id_s, to_remove=""):
        return id_s.replace(to_remove, "")

    @staticmethod
    def __normdate(date_s):
        return sub("[^\d-]", "", date_s)

    @staticmethod
    def __datestrings(l):
        result = []

        for i in l:
            i_str = str(i)
            if len(i_str) == 1:
                i_str = "0" + i_str
            result.append(i_str)

        return result

    def execute_query(self):
        result = None

        if self.conf is None:
            self.add_message("__execute_query", E, "No in-text reference pointers can be retrieved since no "
                                                   "configuration file has been specified.")
        else:
            try:
                i = iter(self.conf["services"])
                while result is None:
                    item = next(i)
                    name, query, tp, use_it, prefix, = \
                        item.get("name"), item.get("query"), item.get("tp"), item.get("use_it"), \
                        item["prefix"] if "prefix" in item else []

                    if use_it == "yes":
                        sparql = SPARQLWrapper(tp)
                        sparql_query = sub("\\[\\[INTREPID\\]\\]", self.intrepid.replace("intrepid:", ""), query)

                        sparql.setQuery(sparql_query)
                        sparql.setReturnFormat(JSON)
                        q_res = sparql.query().convert()["results"]["bindings"]
                        if len(q_res) > 0:
                            answer = q_res[0]
                            result = answer["rp"]["value"]

            except StopIteration:
                pass  # No nothing

        return result

    def validate(self):
        if self.is_valid is None:
            if not self.intrepid.startswith("intrepid:"):
                self.intrepid = "intrepid:" + self.intrepid
                self.add_message("validate", W, "The InTRePID specified as input doesn't start with the 'intrepid:' "
                                                "prefix. This has beed automatically added, resulting in "
                                                "the InTRePID '%s'." % self.intrepid)

            self.is_valid = False
            if match(INTREPID_VALIDATION_REGEX, self.intrepid):
                oci_numerals, ordinal_total = self.intrepid.replace("intrepid:", "").split("/")

                entities = oci_numerals.split("-")
                if all(match(VALIDATION_REGEX, entity) for entity in entities):
                    service_queue = deque(self.conf["services"])

                    while service_queue and not self.is_valid:
                        service_prefixes = service_queue.popleft()["prefix"]
                        self.is_valid = all(sub("^(%s).+$" % PREFIX_REGEX, "\\1", entity) in service_prefixes
                                            for entity in entities)

                    if self.is_valid:
                        try:
                            ordinal, total = ordinal_total.split("-")
                            if int(ordinal) <= int(total):
                                self.add_message("validate", I, "The InTRePID '%s' is syntactically valid."
                                                 % self.intrepid)
                            else:
                                self.add_message("validate", E, "The ordinal part '%s' of the InTRePID '%s' "
                                                                "is not less than or equal to its total part "
                                                                "'%s'." % (ordinal, self.intrepid, total))
                                self.is_valid = False
                        except ValueError:
                            self.is_valid = False
                            self.add_message("validate", E, "The InTRePID '%s' XXX." % self.intrepid)
                    else:
                        self.add_message("validate", E,
                                         "The supplier prefixes '%s' and '%s' used in the identifiers of "
                                         "the citing and cited entities described by the OCI numerals included "
                                         "in the InTRePID '%s' must be assigned to the same supplier. A list of "
                                         "all the available suppliers is available at "
                                         "http://opencitations.net/intrepid." %
                                         (tuple(sub("^(%s).+$" % PREFIX_REGEX, "\\1", entity)
                                                for entity in entities) + (self.intrepid,)))

                else:
                    self.add_message("validate", E, "The InTRePID '%s' is not syntactically correct, since at least "
                                                    "one of the two identifiers of the citing and cited entities "
                                                    "described by the OCI numerals are not compliant with the"
                                                    " following regular expression: '%s'."
                                     % (self.intrepid, VALIDATION_REGEX))
            else:
                self.add_message("validate", E, "The InTRePID '%s' is not syntactically correct, since is "
                                                "not compliant with the following regular expression: '%s'."
                                 % (self.intrepid, VALIDATION_REGEX))

        return self.is_valid

    def get_rp_object(self):
        if self.validate():
            res = self.execute_query()
            if res is not None:
                try:
                    r = get(res, headers={"Accept": "text/turtle"}, timeout=10)
                    if r.status_code == 200:
                        r.encoding = "utf-8"
                        g = Graph()
                        g.parse(data=r.text, format="text/turtle")
                        return g
                    else:
                        self.add_message("get_rp_object", E, "The server did not found any object for the "
                                                             "InTRePID '%s'." % self.intrepid)
                except Timeout:
                    self.add_message("get_rp_object", E, "The server took too many second to return a result.")
            else:
                self.add_message("get_rp_object", I, "No data have been found for the InTRePID '%s'. "
                                                     "While the InTRePID specified is syntactically valid, "
                                                     "it is possible that it does not identify any "
                                                     "in-text reference pointer at all." % self.intrepid)
        else:
            self.add_message("get_rp_object", E, "No in-text reference pointer data can be returned since the "
                                                 "InTRePID specified is not valid.")

    @staticmethod
    def format_rdf(g, f="text/turtle"):
        cur_format = f
        if f in FORMATS:
            cur_format = FORMATS[f]
        return g.serialize(format=cur_format, encoding="utf-8").decode("utf-8")

    def get_rp_data(self, format):
        rp = self.get_rp_object()
        return InTRePIDManager.format_rdf(rp, format)

    def print_messages(self):
        for mes in self.messages:
            print("{%s} [%s] %s" % (mes["operation"], mes["type"], mes["text"]))

    def add_message(self, fun, mes_type, text):
        self.messages.append({"operation": fun, "type": mes_type, "text": text})


if __name__ == "__main__":
    arg_parser = ArgumentParser("intrepid.py", description="This script allows one to validate and retrieve "
                                                           "in-text reference pointer data associated to an InTRePID"
                                                           " (In-Text Reference Pointer Identifier).")

    arg_parser.add_argument("-i", "--intrepid", dest="intrepid", required=True,
                            help="The input InTRePID to use.")
    arg_parser.add_argument("-l", "--lookup", dest="lookup", default="lookup.csv",
                            help="The lookup file to be used for encoding identifiers.")
    arg_parser.add_argument("-c", "--conf", dest="conf", default="intrepid.json",
                            help="The configuration file to run the query services to retrieve in-text reference "
                                 "pointer information.")
    arg_parser.add_argument("-f", "--format", dest="format", default=None,
                            help="If the format is specified, the script tries to retrieve in-text reference pointer"
                                 " information that will be returned in the requested format. Possible formats: "
                                 "'jsonld', 'ttl', 'rdfxml', 'nt'")

    args = arg_parser.parse_args()

    im = InTRePIDManager(args.intrepid, args.lookup, args.conf)

    result = None
    if args.format is None:
        result = im.validate()
    else:
        result = im.get_rp_data(args.format)

    im.print_messages()

    if result is not None:
        print(result)
